import { describe, expect, it } from "vitest";
import { updateRunningTurns } from "./useRunningTurns";

describe("updateRunningTurns", () => {
  it("tracks concurrent turns independently", () => {
    const first = updateRunningTurns(new Map(), { type: "started", threadId: "thread-a", turnId: "turn-a" });
    const both = updateRunningTurns(first, { type: "started", threadId: "thread-b", turnId: "turn-b" });

    expect([...both]).toEqual([
      ["thread-a", "turn-a"],
      ["thread-b", "turn-b"],
    ]);
  });

  it("completing one thread preserves other running turns", () => {
    const running = new Map([
      ["thread-a", "turn-a"],
      ["thread-b", "turn-b"],
    ]);

    const remaining = updateRunningTurns(running, { type: "stopped", threadId: "thread-a" });

    expect([...remaining]).toEqual([["thread-b", "turn-b"]]);
  });

  it("clears all turns when the app-server stops", () => {
    const running = new Map([["thread-a", "turn-a"]]);

    expect([...updateRunningTurns(running, { type: "cleared" })]).toEqual([]);
  });
});
