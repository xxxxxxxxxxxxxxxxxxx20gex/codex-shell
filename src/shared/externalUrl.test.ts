import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./externalUrl";

describe("safeHttpUrl", () => {
  it("accepts HTTP links and rejects executable or malformed schemes", () => {
    expect(safeHttpUrl("https://example.com/oauth?state=1")).toBe("https://example.com/oauth?state=1");
    expect(safeHttpUrl("http://127.0.0.1/callback")).toBe("http://127.0.0.1/callback");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("file:///C:/secret.txt")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
});
