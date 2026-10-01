// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AppServerClient } from "./appServerClient";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { ThreadRevertHistoryError, useThreadRevert } from "./useThreadRevert";

afterEach(cleanup);
const thread = { id: "t", turns: [] } as unknown as Thread;
function setup() {
  const client = {
    listThreadTurns: vi.fn(async () => ({ data: [{ id: "last", status: "completed", items: [{ type: "userMessage" }] }] })),
    revertThread: vi.fn(async () => ({ thread, turnsBackwardsCursor: "retained" })),
    hydrateThreadHistory: vi.fn(async () => ({ thread })),
    readThreadWithHistory: vi.fn(async () => ({ thread })),
  };
  const props = {
    threadIdRef: { current: "t" as string | null }, threadOperationRef: { current: false },
    ensureActiveThread: async () => ({ client: client as unknown as AppServerClient, threadId: "t" }),
    ensureConnected: async () => client as unknown as AppServerClient,
    isThreadRunning: () => false, dispatch: vi.fn(), setSubmitting: vi.fn(), setError: vi.fn(), refreshHistory: vi.fn(async () => {}),
  };
  return { client, props, ...renderHook(() => useThreadRevert(props)) };
}

it("uses the revert cursor once and consumes the local notification without another read", async () => {
  const { client, result } = setup();
  await act(async () => { await result.current.revertLastMessage("t", "last"); });
  act(() => result.current.onThreadReverted({ threadId: "t" }));
  expect(client.hydrateThreadHistory).toHaveBeenCalledWith(thread, "retained");
  expect(client.readThreadWithHistory).not.toHaveBeenCalled();
});

it("rejects late hydration after reset even when the same thread is selected again", async () => {
  const { client, props, result } = setup();
  let finish!: (value: { thread: Thread }) => void;
  client.hydrateThreadHistory.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = result.current.revertLastMessage("t", "last"); });
  await waitFor(() => expect(finish).toBeDefined());
  act(() => result.current.reset());
  props.dispatch.mockClear(); props.setSubmitting.mockClear();
  await act(async () => { finish({ thread }); await expect(pending).rejects.toThrow("会话状态已变化"); });
  expect(props.dispatch).not.toHaveBeenCalled();
  expect(props.setSubmitting).not.toHaveBeenCalled();
});

it("discards notification hydration after a newer turn invalidates it", async () => {
  const { client, props, result } = setup();
  let finish!: (value: { thread: Thread }) => void;
  client.readThreadWithHistory.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  act(() => result.current.onThreadReverted({ threadId: "t" }));
  await waitFor(() => expect(finish).toBeDefined());
  act(() => result.current.invalidate());
  await act(async () => { finish({ thread }); });
  expect(props.dispatch).not.toHaveBeenCalled();
});

it("distinguishes committed revert from hydration failure so a retry cannot delete another turn", async () => {
  const { client, props, result } = setup();
  client.hydrateThreadHistory.mockRejectedValueOnce(new Error("offline"));
  await act(async () => { await expect(result.current.revertLastMessage("t", "last")).rejects.toBeInstanceOf(ThreadRevertHistoryError); });
  expect(props.dispatch).toHaveBeenCalledWith({ type: "loadThread", thread });
  expect(props.threadOperationRef.current).toBe(false);
});
