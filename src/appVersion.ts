import packageJson from "../package.json";

/** The package version exposed to the UI and app-server handshake. */
export const APP_VERSION = packageJson.version;

/** Public release page used by the safe, user-initiated update entry. */
export const RELEASES_LATEST_URL =
  "https://github.com/xxxxxxxxxxxxxxxxxxx20gex/codex-shell/releases/latest";
