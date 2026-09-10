import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("protocol surface gate", () => {
  it("checks actual requests and rejects a missing queue notification", () => {
    const root = resolve("src/generated/app-server");
    const candidate = mkdtempSync(join(tmpdir(), "cs-protocol-surface-"));
    try {
      for (const file of ["ClientRequest.ts", "ClientNotification.ts", "ServerNotificationEnvelope.ts", "ServerRequest.ts"]) {
        writeFileSync(join(candidate, file), readFileSync(join(root, file)));
      }
      const check = () => execFileSync(process.execPath, ["scripts/check-protocol-surface.mjs", candidate], { encoding: "utf8", stdio: "pipe" });
      assert.match(check(), /Protocol surface passed/);
      const envelope = join(candidate, "ServerNotificationEnvelope.ts");
      writeFileSync(envelope, readFileSync(envelope, "utf8").replace('"thread/queue/changed"', '"thread/queue/removed"'));
      assert.throws(check, /thread\/queue\/changed/);
    } finally {
      rmSync(candidate, { recursive: true, force: true });
    }
  });
});
