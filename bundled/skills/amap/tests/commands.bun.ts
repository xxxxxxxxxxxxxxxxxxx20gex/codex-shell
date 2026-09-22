import { beforeAll, describe, expect, it } from "bun:test";

import { executeCommand } from "../scripts/lib/commands.ts";
import { CliError, ExitCode } from "../scripts/lib/config.ts";
import type { HttpGetRequest } from "../scripts/lib/http.ts";
import { validateCommandFlags } from "../scripts/lib/validators.ts";

const fixturePath = (name: string) => new URL(`./fixtures/${name}`, import.meta.url);

const origin = "116.481488,39.990464";
const destination = "116.315613,39.998935";
const uniqueGeocode = { status: "1", geocodes: [{ formatted_address: "测试地址", location: origin }] };
const ambiguousGeocode = {
  status: "1",
  count: "2",
  geocodes: [
    { formatted_address: "北京市甲区同名大厦", city: "北京市", district: "甲区", location: origin },
    { formatted_address: "北京市乙区同名大厦", city: "北京市", district: "乙区", location: destination },
  ],
};

describe("route disambiguation and options", () => {
  for (const command of ["bike-route-address", "walk-route-address", "drive-route-address", "transit-route-address"] as const) {
    for (const endpoint of ["origin", "destination"] as const) {
      it(`${command} stops before routing on ambiguous ${endpoint}`, async () => {
        const calls: HttpGetRequest[] = [];
        const run = executeCommand(command, validateCommandFlags(command, {
          "origin-address": "同名大厦", "destination-address": "同名大厦",
          "origin-city": "北京", "destination-city": "北京",
        }), {
          apiKey: "test-key",
          requestJson: async (request) => {
            calls.push(request);
            return endpoint === "destination" && calls.length === 1 ? uniqueGeocode : ambiguousGeocode;
          },
        });
        await expect(run).rejects.toMatchObject({
          exitCode: ExitCode.AMBIGUOUS_LOCATION, rawResponse: ambiguousGeocode,
        });
        await expect(run).rejects.toThrow(`Ambiguous ${endpoint}`);
        expect(calls).toHaveLength(endpoint === "origin" ? 1 : 2);
        expect(calls.every((request) => request.url.endsWith("/geocode/geo"))).toBe(true);
      });
    }
  }

  it("keeps all candidates for standalone geocode so a confirmed coordinate can be used", async () => {
    const result = await executeCommand("geocode", { address: "同名大厦", city: "北京" }, {
      apiKey: "test-key", requestJson: async () => ambiguousGeocode,
    });
    expect(result).toEqual(ambiguousGeocode);
    const calls: HttpGetRequest[] = [];
    await executeCommand("drive-route-coords", validateCommandFlags("drive-route-coords", {
      origin: ambiguousGeocode.geocodes[1]!.location, destination: origin,
    }), {
      apiKey: "test-key", requestJson: async (request) => { calls.push(request); return { status: "1" }; },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.params.origin).toBe(destination);
  });

  it("rejects malformed coordinates returned by geocoding before calling routing", async () => {
    let calls = 0;
    await expect(executeCommand("drive-route-address", {
      "origin-address": "地址甲", "destination-address": "地址乙",
    }, {
      apiKey: "test-key", requestJson: async () => {
        calls++;
        return { status: "1", geocodes: [{ location: ",39" }] };
      },
    })).rejects.toMatchObject({ exitCode: ExitCode.API_BUSINESS });
    expect(calls).toBe(1);
  });

  for (const command of ["drive-route-coords", "drive-route-address"] as const) {
    it(`${command} forwards strategy and ordered waypoints only to driving`, async () => {
      const calls: HttpGetRequest[] = [];
      const response = { status: "1", route: { paths: [{ tolls: "0" }] } };
      const flags = command === "drive-route-coords" ? { origin, destination } :
        { "origin-address": "地址甲", "destination-address": "地址乙", "origin-city": "北京" };
      const result = await executeCommand(command, validateCommandFlags(command, {
        ...flags, strategy: "14", waypoints: `${origin};${destination}`,
      }), {
        apiKey: "test-key",
        requestJson: async (request) => {
          calls.push(request);
          return request.url.endsWith("/geocode/geo") ? uniqueGeocode : response;
        },
      });
      expect(result).toEqual(response);
      expect(calls).toHaveLength(command === "drive-route-coords" ? 1 : 3);
      expect(calls.at(-1)?.params).toMatchObject({ strategy: "14", waypoints: `${origin};${destination}` });
      for (const request of calls.slice(0, -1)) {
        expect(request.params.strategy).toBeUndefined();
        expect(request.params.waypoints).toBeUndefined();
      }
    });
  }

  it("preserves service defaults when driving options are omitted", async () => {
    await executeCommand("drive-route-coords", validateCommandFlags("drive-route-coords", { origin, destination }), {
      apiKey: "test-key", requestJson: async (request) => {
        expect(request.params.strategy).toBeUndefined();
        expect(request.params.waypoints).toBeUndefined();
        return { status: "1" };
      },
    });
  });

  it("validates waypoint order, precision, ranges, limit and strategy", () => {
    expect(validateCommandFlags("drive-route-coords", {
      origin, destination, strategy: "20", waypoints: Array(16).fill(origin).join(";"),
    }).waypoints?.split(";")).toHaveLength(16);
    for (const waypoints of ["", origin + ";", Array(17).fill(origin).join(";"), "181,39", ",39", "0x10,30", "116.1234567,39"]) {
      expect(() => validateCommandFlags("drive-route-coords", { origin, destination, waypoints })).toThrow(CliError);
    }
    for (const strategy of ["-1", "21", "1.5", "NaN", ""]) {
      expect(() => validateCommandFlags("drive-route-address", {
        "origin-address": "甲", "destination-address": "乙", strategy,
      })).toThrow(CliError);
    }
    expect(() => validateCommandFlags("walk-route-coords", { origin, destination, waypoints: origin })).toThrow(CliError);
  });
});

describe("POI pagination", () => {
  for (const command of ["poi-text", "poi-around"] as const) {
    const base = command === "poi-text" ? { keywords: "咖啡" } : { location: origin };
    it(`${command} requests exactly one selected page and preserves raw results`, async () => {
      const calls: HttpGetRequest[] = [];
      const response = { status: "1", count: "100", pois: [{ id: "test-poi" }] };
      const result = await executeCommand(command, validateCommandFlags(command, { ...base, page: "2", offset: "25" }), {
        apiKey: "test-key", requestJson: async (request) => { calls.push(request); return response; },
      });
      expect(result).toEqual(response);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.params).toMatchObject({ page: "2", offset: "25" });
    });
    it(`${command} preserves pagination defaults and enforces the result window`, () => {
      const defaults = validateCommandFlags(command, base);
      expect(defaults.page).toBeUndefined();
      expect(defaults.offset).toBeUndefined();
      expect(validateCommandFlags(command, { ...base, page: "8", offset: "25" }).page).toBe("8");
      expect(validateCommandFlags(command, { ...base, page: "9", offset: "24" }).page).toBe("9");
      expect(validateCommandFlags(command, { ...base, page: "200", offset: "1" }).page).toBe("200");
      for (const flags of [
        { page: "0" }, { page: "-1" }, { page: "1.5" }, { offset: "0" }, { offset: "26" },
        { page: "9", offset: "25" }, { page: "11" }, { page: "201", offset: "1" },
      ]) {
        expect(() => validateCommandFlags(command, { ...base, ...flags })).toThrow(CliError);
      }
    });
  }
});

async function loadFixture(name: string): Promise<unknown> {
  return JSON.parse(await Bun.file(fixturePath(name)).text());
}

describe("executeCommand", () => {
  let geocodeSuccess: unknown;
  let geocodeEmpty: unknown;
  let geocodeError: unknown;
  let bikeSuccess: unknown;
  let bikeError: unknown;

  beforeAll(async () => {
    geocodeSuccess = await loadFixture("geocode-success.json");
    geocodeEmpty = await loadFixture("geocode-empty.json");
    geocodeError = await loadFixture("geocode-error.json");
    bikeSuccess = await loadFixture("bike-success.json");
    bikeError = await loadFixture("bike-error.json");
  });

  it("returns raw geocode JSON on success", async () => {
    const calls: HttpGetRequest[] = [];

    const result = await executeCommand(
      "geocode",
      validateCommandFlags("geocode", { address: "北京市朝阳区阜通东大街6号" }) as Record<string, unknown>,
      {
        apiKey: "test-key",
        requestJson: async (request) => {
          calls.push(request);
          return geocodeSuccess;
        },
      },
    );

    expect(result).toEqual(geocodeSuccess);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/v3/geocode/geo");
    expect(calls[0]?.params.key).toBe("test-key");
    expect(calls[0]?.params.address).toBe("北京市朝阳区阜通东大街6号");
  });

  it("fails with exit code 4 when geocode returns status=0", async () => {
    const command = executeCommand(
      "geocode",
      validateCommandFlags("geocode", { address: "invalid" }) as Record<string, unknown>,
      {
        apiKey: "test-key",
        requestJson: async () => geocodeError,
      },
    );

    await expect(command).rejects.toBeInstanceOf(CliError);

    try {
      await command;
    } catch (error) {
      const cliError = error as CliError;
      expect(cliError.exitCode).toBe(ExitCode.API_BUSINESS);
      expect(cliError.rawResponse).toEqual(geocodeError);
    }
  });

  it("fails with exit code 4 when bike route v4 errcode != 0", async () => {
    const command = executeCommand(
      "bike-route-coords",
      validateCommandFlags("bike-route-coords", {
        origin: "116.481488,39.990464",
        destination: "116.315613,39.998935",
      }) as Record<string, unknown>,
      {
        apiKey: "test-key",
        requestJson: async () => bikeError,
      },
    );

    await expect(command).rejects.toBeInstanceOf(CliError);

    try {
      await command;
    } catch (error) {
      const cliError = error as CliError;
      expect(cliError.exitCode).toBe(ExitCode.API_BUSINESS);
      expect(cliError.rawResponse).toEqual(bikeError);
    }
  });

  it("fails early when address route geocode has no results", async () => {
    let callCount = 0;

    const command = executeCommand(
      "bike-route-address",
      validateCommandFlags("bike-route-address", {
        "origin-address": "北京市朝阳区阜通东大街6号",
        "destination-address": "北京市海淀区上地十街10号",
        "origin-city": "北京",
        "destination-city": "北京",
      }) as Record<string, unknown>,
      {
        apiKey: "test-key",
        requestJson: async () => {
          callCount += 1;
          if (callCount === 1) {
            return geocodeSuccess;
          }
          if (callCount === 2) {
            return geocodeEmpty;
          }
          return bikeSuccess;
        },
      },
    );

    await expect(command).rejects.toBeInstanceOf(CliError);

    try {
      await command;
    } catch (error) {
      const cliError = error as CliError;
      expect(cliError.exitCode).toBe(ExitCode.API_BUSINESS);
      expect(cliError.rawResponse).toEqual(geocodeEmpty);
    }

    expect(callCount).toBe(2);
  });

  it("propagates network failures with exit code 3", async () => {
    const command = executeCommand(
      "poi-detail",
      validateCommandFlags("poi-detail", { id: "B000A8URXB" }) as Record<string, unknown>,
      {
        apiKey: "test-key",
        requestJson: async () => {
          throw new CliError("network timeout", ExitCode.NETWORK);
        },
      },
    );

    await expect(command).rejects.toBeInstanceOf(CliError);

    try {
      await command;
    } catch (error) {
      const cliError = error as CliError;
      expect(cliError.exitCode).toBe(ExitCode.NETWORK);
      expect(cliError.message).toContain("network timeout");
    }
  });
});
