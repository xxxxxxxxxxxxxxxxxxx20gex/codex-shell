import type { CommandName } from "./validators.ts";

export interface CommandHelp {
  usage: string;
  description: string;
}

export const COMMAND_HELP_MAP: Record<CommandName, CommandHelp> = {
  "reverse-geocode": {
    usage: "reverse-geocode --location <lon,lat>",
    description: "Convert coordinates to administrative address fields.",
  },
  geocode: {
    usage: "geocode --address <text> [--city <text>]",
    description: "Convert structured address to coordinates.",
  },
  "ip-location": {
    usage: "ip-location --ip <ipv4>",
    description: "Resolve an IPv4 address to location info.",
  },
  weather: {
    usage: "weather --city <name|adcode> [--extensions <base|all>]",
    description: "Query weather by city name or adcode.",
  },
  "bike-route-coords": {
    usage: "bike-route-coords --origin <lon,lat> --destination <lon,lat>",
    description: "Plan bicycle route by coordinates.",
  },
  "bike-route-address": {
    usage:
      "bike-route-address --origin-address <text> --destination-address <text> [--origin-city <text>] [--destination-city <text>]",
    description: "Plan bicycle route by addresses (internally geocode first).",
  },
  "walk-route-coords": {
    usage: "walk-route-coords --origin <lon,lat> --destination <lon,lat>",
    description: "Plan walking route by coordinates.",
  },
  "walk-route-address": {
    usage:
      "walk-route-address --origin-address <text> --destination-address <text> [--origin-city <text>] [--destination-city <text>]",
    description: "Plan walking route by addresses (internally geocode first).",
  },
  "drive-route-coords": {
    usage: "drive-route-coords --origin <lon,lat> --destination <lon,lat> [--strategy <0..20>] [--waypoints <lon,lat;...>]",
    description: "Plan driving route by coordinates.",
  },
  "drive-route-address": {
    usage:
      "drive-route-address --origin-address <text> --destination-address <text> [--origin-city <text>] [--destination-city <text>] [--strategy <0..20>] [--waypoints <lon,lat;...>]",
    description: "Plan driving route by addresses (internally geocode first).",
  },
  "transit-route-coords": {
    usage: "transit-route-coords --origin <lon,lat> --destination <lon,lat> --city <text> --cityd <text>",
    description: "Plan integrated transit route by coordinates.",
  },
  "transit-route-address": {
    usage:
      "transit-route-address --origin-address <text> --destination-address <text> --origin-city <text> --destination-city <text>",
    description: "Plan integrated transit route by addresses (internally geocode first).",
  },
  distance: {
    usage: "distance --origins <lon,lat|lon,lat...> --destination <lon,lat> [--type <0|1|3>]",
    description: "Measure distance between origins and destination.",
  },
  "poi-text": {
    usage: "poi-text --keywords <text> [--city <text>] [--citylimit <true|false>] [--page <int>] [--offset <1..25>]",
    description: "Search POI by keyword.",
  },
  "poi-around": {
    usage: "poi-around --location <lon,lat> [--radius <int>] [--keywords <text>] [--page <int>] [--offset <1..25>]",
    description: "Search POI around a center point.",
  },
  "poi-detail": {
    usage: "poi-detail --id <poi-id>",
    description: "Query POI details by id.",
  },
};

export const COMMAND_ORDER: CommandName[] = [
  "reverse-geocode",
  "geocode",
  "ip-location",
  "weather",
  "bike-route-coords",
  "bike-route-address",
  "walk-route-coords",
  "walk-route-address",
  "drive-route-coords",
  "drive-route-address",
  "transit-route-coords",
  "transit-route-address",
  "distance",
  "poi-text",
  "poi-around",
  "poi-detail",
];
