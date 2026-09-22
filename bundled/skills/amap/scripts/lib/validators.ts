import { CliError, ExitCode } from "./config.ts";
import { COMMAND_ORDER } from "./command-help.ts";
export { COMMAND_HELP_MAP, COMMAND_ORDER, type CommandHelp } from "./command-help.ts";

interface DrivingOptions {
  strategy?: string;
  waypoints?: string;
}

interface PaginationOptions {
  page?: string;
  offset?: string;
}

export type CommandName =
  | "reverse-geocode"
  | "geocode"
  | "ip-location"
  | "weather"
  | "bike-route-coords"
  | "bike-route-address"
  | "walk-route-coords"
  | "walk-route-address"
  | "drive-route-coords"
  | "drive-route-address"
  | "transit-route-coords"
  | "transit-route-address"
  | "distance"
  | "poi-text"
  | "poi-around"
  | "poi-detail";

interface CommandFlagMap {
  "reverse-geocode": {
    location: string;
  };
  geocode: {
    address: string;
    city?: string;
  };
  "ip-location": {
    ip: string;
  };
  weather: {
    city: string;
    extensions: "base" | "all";
  };
  "bike-route-coords": {
    origin: string;
    destination: string;
  };
  "bike-route-address": {
    "origin-address": string;
    "destination-address": string;
    "origin-city"?: string;
    "destination-city"?: string;
  };
  "walk-route-coords": {
    origin: string;
    destination: string;
  };
  "walk-route-address": {
    "origin-address": string;
    "destination-address": string;
    "origin-city"?: string;
    "destination-city"?: string;
  };
  "drive-route-coords": DrivingOptions & {
    origin: string;
    destination: string;
  };
  "drive-route-address": DrivingOptions & {
    "origin-address": string;
    "destination-address": string;
    "origin-city"?: string;
    "destination-city"?: string;
  };
  "transit-route-coords": {
    origin: string;
    destination: string;
    city: string;
    cityd: string;
  };
  "transit-route-address": {
    "origin-address": string;
    "destination-address": string;
    "origin-city": string;
    "destination-city": string;
  };
  distance: {
    origins: string;
    destination: string;
    type: "0" | "1" | "3";
  };
  "poi-text": PaginationOptions & {
    keywords: string;
    city?: string;
    citylimit: "true" | "false";
  };
  "poi-around": PaginationOptions & {
    location: string;
    radius: string;
    keywords?: string;
  };
  "poi-detail": {
    id: string;
  };
}

export type ValidatedFlags<K extends CommandName> = CommandFlagMap[K];

const COMMAND_NAME_SET = new Set<string>(COMMAND_ORDER);

const ALLOWED_FLAG_NAMES: Record<CommandName, readonly string[]> = {
  "reverse-geocode": ["location"],
  geocode: ["address", "city"],
  "ip-location": ["ip"],
  weather: ["city", "extensions"],
  "bike-route-coords": ["origin", "destination"],
  "bike-route-address": ["origin-address", "destination-address", "origin-city", "destination-city"],
  "walk-route-coords": ["origin", "destination"],
  "walk-route-address": ["origin-address", "destination-address", "origin-city", "destination-city"],
  "drive-route-coords": ["origin", "destination", "strategy", "waypoints"],
  "drive-route-address": ["origin-address", "destination-address", "origin-city", "destination-city", "strategy", "waypoints"],
  "transit-route-coords": ["origin", "destination", "city", "cityd"],
  "transit-route-address": ["origin-address", "destination-address", "origin-city", "destination-city"],
  distance: ["origins", "destination", "type"],
  "poi-text": ["keywords", "city", "citylimit", "page", "offset"],
  "poi-around": ["location", "radius", "keywords", "page", "offset"],
  "poi-detail": ["id"],
};

function throwInvalidFlags(command: CommandName, message: string): never {
  throw new CliError(`Invalid flags for ${command}: ${message}`, ExitCode.PARAM_OR_CONFIG);
}

function ensureNoUnknownFlags(command: CommandName, rawFlags: Record<string, string>): void {
  const allowed = new Set(ALLOWED_FLAG_NAMES[command]);
  const unknownFlags: string[] = [];

  for (const key of Object.keys(rawFlags)) {
    if (!allowed.has(key)) {
      unknownFlags.push(`--${key}`);
    }
  }

  if (unknownFlags.length > 0) {
    throwInvalidFlags(command, `unknown flags: ${unknownFlags.join(", ")}`);
  }
}

function normalizeOptionalString(command: CommandName, rawFlags: Record<string, string>, key: string): string | undefined {
  const value = rawFlags[key];
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    throwInvalidFlags(command, `${key}: must be a non-empty string`);
  }

  return normalized;
}

function normalizeRequiredString(command: CommandName, rawFlags: Record<string, string>, key: string): string {
  const normalized = normalizeOptionalString(command, rawFlags, key);
  if (!normalized) {
    throwInvalidFlags(command, `${key}: is required`);
  }
  return normalized;
}

export function isValidCoordinate(value: string): boolean {
  const parts = value.split(",");
  if (parts.length !== 2 || parts.some((part) => !/^-?\d+(?:\.\d+)?$/.test(part.trim()))) {
    return false;
  }

  const longitude = Number(parts[0]?.trim());
  const latitude = Number(parts[1]?.trim());

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return false;
  }

  return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
}

function validateCoordinate(command: CommandName, key: string, value: string): string {
  if (!isValidCoordinate(value)) {
    throwInvalidFlags(command, `${key}: must be in <longitude,latitude> format with valid numeric ranges`);
  }

  return value;
}

function validateIPv4(command: CommandName, key: string, value: string): string {
  const parts = value.split(".");
  if (parts.length !== 4) {
    throwInvalidFlags(command, `${key}: must be a valid IPv4 address`);
  }

  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      throwInvalidFlags(command, `${key}: must be a valid IPv4 address`);
    }

    const number = Number(part);
    if (!Number.isInteger(number) || number < 0 || number > 255) {
      throwInvalidFlags(command, `${key}: must be a valid IPv4 address`);
    }
  }

  return value;
}

function validateOrigins(command: CommandName, key: string, value: string): string {
  const coordinates = value.split("|").map((item) => item.trim());
  if (coordinates.length === 0) {
    throwInvalidFlags(command, `${key}: must be in <lon,lat|lon,lat...> format`);
  }

  for (const coordinate of coordinates) {
    if (!isValidCoordinate(coordinate)) {
      throwInvalidFlags(command, `${key}: must be in <lon,lat|lon,lat...> format`);
    }
  }

  return value;
}

function validateEnum<T extends string>(
  command: CommandName,
  key: string,
  value: string,
  allowed: readonly T[],
): T {
  if (!allowed.includes(value as T)) {
    throwInvalidFlags(command, `${key}: must be one of ${allowed.join(", ")}`);
  }

  return value as T;
}

function validateRadius(command: CommandName, key: string, value: string): string {
  if (!/^\d+$/.test(value)) {
    throwInvalidFlags(command, `${key}: must be a positive integer`);
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throwInvalidFlags(command, `${key}: must be a positive integer`);
  }

  return value;
}

function validateInteger(command: CommandName, key: string, value: string, min: number, max: number): string {
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < min || number > max) {
    throwInvalidFlags(command, `${key}: must be an integer between ${min} and ${max}`);
  }
  return String(number);
}

function validateDrivingOptions(command: CommandName, rawFlags: Record<string, string>): DrivingOptions {
  const strategy = normalizeOptionalString(command, rawFlags, "strategy");
  const waypoints = normalizeOptionalString(command, rawFlags, "waypoints");
  let normalizedWaypoints: string | undefined;
  if (waypoints !== undefined) {
    const points = waypoints.split(";").map((point) => point.trim());
    if (points.length > 16 || points.some((point) =>
      !isValidCoordinate(point) || point.split(",").some((part) => !/^-?\d+(?:\.\d{1,6})?$/.test(part.trim()))
    )) {
      throwInvalidFlags(command, "waypoints: provide 1..16 lon,lat points separated by ; with at most 6 decimal places");
    }
    normalizedWaypoints = points.map((point) => point.split(",").map((part) => part.trim()).join(",")).join(";");
  }
  return {
    strategy: strategy === undefined ? undefined : validateInteger(command, "strategy", strategy, 0, 20),
    waypoints: normalizedWaypoints,
  };
}

function validatePagination(command: CommandName, rawFlags: Record<string, string>): PaginationOptions {
  const page = normalizeOptionalString(command, rawFlags, "page");
  const offset = normalizeOptionalString(command, rawFlags, "offset");
  const result = {
    page: page === undefined ? undefined : validateInteger(command, "page", page, 1, 200),
    offset: offset === undefined ? undefined : validateInteger(command, "offset", offset, 1, 25),
  };
  // AMap exposes at most 200 results for the same query. Permit a partial last page.
  if ((Number(result.page ?? "1") - 1) * Number(result.offset ?? "20") >= 200) {
    throwInvalidFlags(command, "page: starts beyond AMap's 200-result query limit");
  }
  return result;
}

function validateCoordsRoute<K extends "bike-route-coords" | "walk-route-coords" | "drive-route-coords">(
  command: K,
  rawFlags: Record<string, string>,
): ValidatedFlags<K> {
  const origin = validateCoordinate(command, "origin", normalizeRequiredString(command, rawFlags, "origin"));
  const destination = validateCoordinate(
    command,
    "destination",
    normalizeRequiredString(command, rawFlags, "destination"),
  );

  return {
    origin,
    destination,
  } as ValidatedFlags<K>;
}

function validateAddressRoute<K extends "bike-route-address" | "walk-route-address" | "drive-route-address">(
  command: K,
  rawFlags: Record<string, string>,
): ValidatedFlags<K> {
  return {
    "origin-address": normalizeRequiredString(command, rawFlags, "origin-address"),
    "destination-address": normalizeRequiredString(command, rawFlags, "destination-address"),
    "origin-city": normalizeOptionalString(command, rawFlags, "origin-city"),
    "destination-city": normalizeOptionalString(command, rawFlags, "destination-city"),
  } as ValidatedFlags<K>;
}

export function isCommandName(value: string): value is CommandName {
  return COMMAND_NAME_SET.has(value);
}

export function validateCommandFlags<K extends CommandName>(
  command: K,
  rawFlags: Record<string, string>,
): ValidatedFlags<K> {
  ensureNoUnknownFlags(command, rawFlags);

  switch (command) {
    case "reverse-geocode": {
      const location = validateCoordinate(
        command,
        "location",
        normalizeRequiredString(command, rawFlags, "location"),
      );
      return { location } as ValidatedFlags<K>;
    }
    case "geocode": {
      return {
        address: normalizeRequiredString(command, rawFlags, "address"),
        city: normalizeOptionalString(command, rawFlags, "city"),
      } as ValidatedFlags<K>;
    }
    case "ip-location": {
      const ip = validateIPv4(command, "ip", normalizeRequiredString(command, rawFlags, "ip"));
      return { ip } as ValidatedFlags<K>;
    }
    case "weather": {
      const extensionsRaw = normalizeOptionalString(command, rawFlags, "extensions") ?? "all";
      const extensions = validateEnum(command, "extensions", extensionsRaw, ["base", "all"]);
      return {
        city: normalizeRequiredString(command, rawFlags, "city"),
        extensions,
      } as ValidatedFlags<K>;
    }
    case "bike-route-coords":
    case "walk-route-coords": {
      return validateCoordsRoute(command, rawFlags) as ValidatedFlags<K>;
    }
    case "bike-route-address":
    case "walk-route-address": {
      return validateAddressRoute(command, rawFlags) as ValidatedFlags<K>;
    }
    case "drive-route-coords": {
      return { ...validateCoordsRoute(command, rawFlags), ...validateDrivingOptions(command, rawFlags) } as ValidatedFlags<K>;
    }
    case "drive-route-address": {
      return { ...validateAddressRoute(command, rawFlags), ...validateDrivingOptions(command, rawFlags) } as ValidatedFlags<K>;
    }
    case "transit-route-coords": {
      return {
        origin: validateCoordinate(command, "origin", normalizeRequiredString(command, rawFlags, "origin")),
        destination: validateCoordinate(
          command,
          "destination",
          normalizeRequiredString(command, rawFlags, "destination"),
        ),
        city: normalizeRequiredString(command, rawFlags, "city"),
        cityd: normalizeRequiredString(command, rawFlags, "cityd"),
      } as ValidatedFlags<K>;
    }
    case "transit-route-address": {
      return {
        "origin-address": normalizeRequiredString(command, rawFlags, "origin-address"),
        "destination-address": normalizeRequiredString(command, rawFlags, "destination-address"),
        "origin-city": normalizeRequiredString(command, rawFlags, "origin-city"),
        "destination-city": normalizeRequiredString(command, rawFlags, "destination-city"),
      } as ValidatedFlags<K>;
    }
    case "distance": {
      const origins = validateOrigins(command, "origins", normalizeRequiredString(command, rawFlags, "origins"));
      const destination = validateCoordinate(
        command,
        "destination",
        normalizeRequiredString(command, rawFlags, "destination"),
      );
      const typeRaw = normalizeOptionalString(command, rawFlags, "type") ?? "1";
      const type = validateEnum(command, "type", typeRaw, ["0", "1", "3"]);

      return {
        origins,
        destination,
        type,
      } as ValidatedFlags<K>;
    }
    case "poi-text": {
      const citylimitRaw = normalizeOptionalString(command, rawFlags, "citylimit") ?? "false";
      const citylimit = validateEnum(command, "citylimit", citylimitRaw, ["true", "false"]);

      return {
        keywords: normalizeRequiredString(command, rawFlags, "keywords"),
        city: normalizeOptionalString(command, rawFlags, "city"),
        citylimit,
        ...validatePagination(command, rawFlags),
      } as ValidatedFlags<K>;
    }
    case "poi-around": {
      const location = validateCoordinate(
        command,
        "location",
        normalizeRequiredString(command, rawFlags, "location"),
      );
      const radiusRaw = normalizeOptionalString(command, rawFlags, "radius") ?? "1000";
      const radius = validateRadius(command, "radius", radiusRaw);

      return {
        location,
        radius,
        keywords: normalizeOptionalString(command, rawFlags, "keywords"),
        ...validatePagination(command, rawFlags),
      } as ValidatedFlags<K>;
    }
    case "poi-detail": {
      return {
        id: normalizeRequiredString(command, rawFlags, "id"),
      } as ValidatedFlags<K>;
    }
    default: {
      const unhandled: never = command;
      throwInvalidFlags(command, `unsupported command: ${String(unhandled)}`);
    }
  }
}
