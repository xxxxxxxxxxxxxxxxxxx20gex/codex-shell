import { describe, expect, it } from "vitest";
import {
  appendRuntimeLogs,
  normalizeRuntimeLogLine,
  type RuntimeLogEntry,
} from "./useRuntimeLogs";

function entry(id: number): RuntimeLogEntry {
  return { id, receivedAt: id, line: `line-${id}` };
}

describe("runtime log buffer", () => {
  it("strips terminal formatting and caps oversized lines", () => {
    expect(normalizeRuntimeLogLine("\u001b[31merror\u001b[0m")).toBe("error");
    const oversized = normalizeRuntimeLogLine("x".repeat(4_100));
    expect(oversized).toHaveLength(4_008);
    expect(oversized).toMatch(/（该行已截断）$/);
  });

  it("keeps only the newest 200 entries", () => {
    const entries = Array.from({ length: 205 }, (_, id) => entry(id));

    expect(appendRuntimeLogs([], entries)).toEqual(entries.slice(5));
    expect(appendRuntimeLogs(entries.slice(0, 199), [entry(205), entry(206)]))
      .toEqual([...entries.slice(1, 199), entry(205), entry(206)]);
  });
});
