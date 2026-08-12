import { describe, expect, it } from "vitest";
import {
  canSteerRunningTurn,
  runningTurnLabel,
  updateRunningTurns,
} from "./useRunningTurns";

describe("updateRunningTurns", () => {
  it("tracks concurrent regular turns independently", () => {
    const first = updateRunningTurns(new Map(), {
      type: "started",
      threadId: "thread-a",
      turnId: "turn-a",
      kind: "regular",
    });
    const both = updateRunningTurns(first, {
      type: "started",
      threadId: "thread-b",
      turnId: "turn-b",
      kind: "regular",
    });

    expect([...both]).toEqual([
      ["thread-a", { turnId: "turn-a", kind: "regular", activeFlags: [] }],
      ["thread-b", { turnId: "turn-b", kind: "regular", activeFlags: [] }],
    ]);
  });

  it("preserves the known kind and turn id when status flags change", () => {
    const review = updateRunningTurns(new Map(), {
      type: "started",
      threadId: "thread-a",
      turnId: "review-a",
      kind: "review",
    });
    const waiting = updateRunningTurns(review, {
      type: "active",
      threadId: "thread-a",
      activeFlags: ["waitingOnApproval"],
    });

    expect(waiting.get("thread-a")).toEqual({
      turnId: "review-a",
      kind: "review",
      activeFlags: ["waitingOnApproval"],
    });
  });

  it("treats status-only active threads as unknown and non-steerable", () => {
    const active = updateRunningTurns(new Map(), {
      type: "active",
      threadId: "thread-a",
      activeFlags: [],
    });

    expect(active.get("thread-a")).toEqual({
      turnId: null,
      kind: "unknown",
      activeFlags: [],
    });
    expect(canSteerRunningTurn(active.get("thread-a"))).toBe(false);
  });

  it("does not let a generic turn notification overwrite a known review kind", () => {
    const review = updateRunningTurns(new Map(), {
      type: "started",
      threadId: "thread-a",
      turnId: "turn-a",
      kind: "review",
    });
    const notified = updateRunningTurns(review, {
      type: "started",
      threadId: "thread-a",
      turnId: "turn-a",
      kind: "unknown",
    });

    expect(notified).toBe(review);
  });

  it("stops one thread without affecting another and clears all on shutdown", () => {
    const running = new Map([
      ["thread-a", { turnId: "turn-a", kind: "regular" as const, activeFlags: [] }],
      ["thread-b", { turnId: null, kind: "compact" as const, activeFlags: [] }],
    ]);

    const remaining = updateRunningTurns(running, { type: "stopped", threadId: "thread-a" });
    expect([...remaining]).toEqual([
      ["thread-b", { turnId: null, kind: "compact", activeFlags: [] }],
    ]);
    expect([...updateRunningTurns(remaining, { type: "cleared" })]).toEqual([]);
  });
});

describe("running Turn presentation", () => {
  it("only permits steering a regular turn with an id", () => {
    expect(canSteerRunningTurn({ turnId: "turn-a", kind: "regular", activeFlags: [] })).toBe(true);
    expect(canSteerRunningTurn({ turnId: "turn-a", kind: "review", activeFlags: [] })).toBe(false);
    expect(canSteerRunningTurn({ turnId: null, kind: "regular", activeFlags: [] })).toBe(false);
    expect(canSteerRunningTurn({
      turnId: "turn-a",
      kind: "regular",
      activeFlags: ["waitingOnApproval"],
    })).toBe(false);
  });

  it("prioritizes app-server waiting flags in the status label", () => {
    expect(runningTurnLabel({
      turnId: "turn-a",
      kind: "regular",
      activeFlags: ["waitingOnApproval"],
    })).toBe("等待批准");
    expect(runningTurnLabel({
      turnId: null,
      kind: "compact",
      activeFlags: [],
    })).toBe("正在压缩上下文");
  });
});
