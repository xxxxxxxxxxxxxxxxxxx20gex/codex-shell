import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";

const CLI_PATH = fileURLToPath(new URL("../scripts/amap.ts", import.meta.url));

interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function runCli(args: string[], envOverrides: Record<string, string | null> = {}): Promise<CliResult> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }

  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === null) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  const processHandle = Bun.spawn(["bun", CLI_PATH, ...args], {
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(processHandle.stdout).text();
  const stderr = await new Response(processHandle.stderr).text();
  const exitCode = await processHandle.exited;

  return {
    exitCode,
    stdout,
    stderr,
  };
}

describe("amap CLI", () => {
  it("shows global help", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("AMap Script CLI");
    expect(result.stdout).toContain("reverse-geocode --location <lon,lat>");
  });

  it("returns exit code 2 for unknown command", async () => {
    const result = await runCli(["unknown-command"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Unknown command");
  });

  it("returns exit code 2 when API key is missing", async () => {
    const result = await runCli(["geocode", "--address", "北京市朝阳区阜通东大街6号"], {
      AMAP_MAPS_API_KEY: null,
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("AMAP_MAPS_API_KEY is required");
  });

  it("returns exit code 2 for invalid coordinate format", async () => {
    const result = await runCli(["reverse-geocode", "--location", "invalid-coordinate"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid flags");
  });

  it("reports ambiguity on stderr and preserves candidates on stdout with exit code 6", async () => {
    const payload = {
      status: "1", count: "2",
      geocodes: [
        { formatted_address: "甲区同名大厦", location: "116,39" },
        { formatted_address: "乙区同名大厦", location: "117,40" },
      ],
    };
    const program = [
      `globalThis.fetch = async () => Response.json(${JSON.stringify(payload)});`,
      'process.env.AMAP_MAPS_API_KEY = "test-key";',
      'process.argv = ["bun", "amap.ts", "drive-route-address", "--origin-address", "同名大厦", "--destination-address", "车站"];',
      `await import(${JSON.stringify(new URL("../scripts/amap.ts", import.meta.url).href)});`,
    ].join("\n");
    const child = Bun.spawn([process.execPath, "--eval", program], { stdout: "pipe", stderr: "pipe" });
    const stdout = await new Response(child.stdout).text();
    const stderr = await new Response(child.stderr).text();
    expect(await child.exited).toBe(6);
    expect(JSON.parse(stdout)).toEqual(payload);
    expect(stderr).toContain("Ambiguous origin");
    expect(stderr).not.toContain("test-key");
  });

  it("rejects an out-of-window POI page before requesting a key or network", async () => {
    const result = await runCli(["poi-text", "--keywords", "咖啡", "--page", "9", "--offset", "25"], {
      AMAP_MAPS_API_KEY: null,
    });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("200-result");
  });
});
