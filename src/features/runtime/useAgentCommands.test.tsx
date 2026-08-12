// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AppServerClient } from "./appServerClient";
import { useAgentCommands } from "./useAgentCommands";

describe("useAgentCommands", () => {
  it("marks manual compaction as a non-steerable active operation", async () => {
    const client = {
      compactThread: vi.fn(async () => ({})),
    } as unknown as AppServerClient;
    const markThreadRunning = vi.fn();
    const markThreadStopped = vi.fn();
    const { result } = renderHook(() => useAgentCommands(
      vi.fn(async () => client),
      vi.fn(async () => ({ client, threadId: "thread-a" })),
      vi.fn(() => "thread-a"),
      "C:\\work",
      markThreadRunning,
      markThreadStopped,
    ));

    await act(async () => {
      await result.current.compactThread();
    });

    expect(client.compactThread).toHaveBeenCalledWith({ threadId: "thread-a" });
    expect(markThreadRunning).toHaveBeenCalledWith("thread-a", null, "compact");
    expect(markThreadStopped).not.toHaveBeenCalled();
  });

  it("clears the compact state when app-server rejects the request", async () => {
    const client = {
      compactThread: vi.fn(async () => { throw new Error("compact failed"); }),
    } as unknown as AppServerClient;
    const markThreadRunning = vi.fn();
    const markThreadStopped = vi.fn();
    const { result } = renderHook(() => useAgentCommands(
      vi.fn(async () => client),
      vi.fn(async () => ({ client, threadId: "thread-a" })),
      vi.fn(() => "thread-a"),
      "C:\\work",
      markThreadRunning,
      markThreadStopped,
    ));

    await expect(result.current.compactThread()).rejects.toThrow("compact failed");
    expect(markThreadRunning).toHaveBeenCalledWith("thread-a", null, "compact");
    expect(markThreadStopped).toHaveBeenCalledWith("thread-a");
  });
});
