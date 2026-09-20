import { expect, it } from "bun:test";
import { getJsonWithRetry } from "../scripts/lib/http.ts";

it("omits credentials from HTTP and JSON error messages", async () => {
  const originalFetch = globalThis.fetch;
  const apiKey = "regression-secret-key";
  try {
    for (const response of [
      new Response("denied", { status: 403 }),
      new Response("not json", { status: 200 }),
    ]) {
      globalThis.fetch = (async () => response) as typeof fetch;
      let caught: unknown;
      try {
        await getJsonWithRetry({
          url: "https://restapi.amap.com/v3/place/text",
          params: { key: apiKey, keywords: "hotel" },
          retries: 0,
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Error);
      const message = (caught as Error).message;
      expect(message).toContain("https://restapi.amap.com/v3/place/text");
      expect(message).not.toContain(apiKey);
      expect(message).not.toContain("key=");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
