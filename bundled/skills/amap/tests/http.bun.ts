import { expect, it } from "bun:test";
import { getJsonWithRetry } from "../scripts/lib/http.ts";

it("keeps the deadline active while reading the body", async () => {
  const originalFetch = globalThis.fetch;
  let aborted = false;
  globalThis.fetch = (async (_url, options) => ({
    ok: true,
    json: () => new Promise((_resolve, reject) => {
      const guard = setTimeout(() => reject(new Error("test guard expired")), 100);
      options?.signal?.addEventListener("abort", () => {
        aborted = true;
        clearTimeout(guard);
        reject(new Error("body aborted"));
      }, { once: true });
    }),
  })) as typeof fetch;
  try {
    await expect(getJsonWithRetry({ url: "https://restapi.amap.com/v3/place/text", params: {}, timeoutMs: 10, retries: 0 })).rejects.toThrow();
    expect(aborted).toBe(true);
  } finally { globalThis.fetch = originalFetch; }
});

it("does not retry permanent HTTP failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; return new Response("denied", { status: 403 }); }) as typeof fetch;
  try {
    await expect(getJsonWithRetry({ url: "https://restapi.amap.com/v3/place/text", params: {}, retries: 1 })).rejects.toThrow("403");
    expect(calls).toBe(1);
  } finally { globalThis.fetch = originalFetch; }
});

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

it("retries transient failures and returns the successful result", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => ++calls === 1 ? new Response("busy", { status: 503 }) : Response.json({ status: "1" })) as typeof fetch;
  try {
    expect(await getJsonWithRetry({ url: "https://restapi.amap.com/v3/place/text", params: {}, retries: 1 })).toEqual({ status: "1" });
    expect(calls).toBe(2);
  } finally { globalThis.fetch = originalFetch; }
});

it("clears failed-fetch timers and keeps transport details out of public errors", async () => {
  const originalFetch = globalThis.fetch;
  let aborted = false;
  globalThis.fetch = (async (_url, options) => {
    options?.signal?.addEventListener("abort", () => { aborted = true; });
    throw new Error("request failed at ?key=regression-secret");
  }) as typeof fetch;
  try {
    let caught: unknown;
    try { await getJsonWithRetry({ url: "https://restapi.amap.com/v3/place/text", params: {}, timeoutMs: 10, retries: 0 }); }
    catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).not.toContain("regression-secret");
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(aborted).toBe(false);
  } finally { globalThis.fetch = originalFetch; }
});
