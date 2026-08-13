// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MAX_QUEUED_TURNS_PER_THREAD, useQueuedTurns } from "./useQueuedTurns";

const queuedInput = {
  text: "下一条",
  mentions: [],
  skills: [],
  collaborationMode: "default" as const,
  settings: {
    baseUrl: "https://example.test/v1",
    modelId: "gpt-test",
    reasoningEffort: "low" as const,
    verbosity: "low" as const,
  },
  permissionMode: "full" as const,
};

describe("useQueuedTurns", () => {
  it("isolates queues by Thread and supports removing a pending message", () => {
    const { result } = renderHook(useQueuedTurns);
    act(() => {
      result.current.enqueue("thread-a", { ...queuedInput, text: "上海" });
      result.current.enqueue("thread-b", { ...queuedInput, text: "广州" });
    });

    expect(result.current.get("thread-a").map((input) => input.text)).toEqual(["上海"]);
    expect(result.current.get("thread-b").map((input) => input.text)).toEqual(["广州"]);

    act(() => result.current.remove("thread-a", result.current.get("thread-a")[0].id));
    expect(result.current.get("thread-a")).toEqual([]);
    expect(result.current.get("thread-b").map((input) => input.text)).toEqual(["广州"]);
  });

  it("enforces a hard per-Thread queue limit", () => {
    const { result } = renderHook(useQueuedTurns);
    act(() => {
      for (let index = 0; index < MAX_QUEUED_TURNS_PER_THREAD; index += 1) {
        expect(result.current.enqueue("thread-a", { ...queuedInput, text: `消息 ${index}` })).toBe(true);
      }
      expect(result.current.enqueue("thread-a", queuedInput)).toBe(false);
    });
    expect(result.current.get("thread-a")).toHaveLength(MAX_QUEUED_TURNS_PER_THREAD);
  });
});
