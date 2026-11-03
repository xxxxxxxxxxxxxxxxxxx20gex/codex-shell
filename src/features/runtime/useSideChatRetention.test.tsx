// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AppServerClient } from "./appServerClient";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { Turn } from "../../generated/app-server/v2/Turn";
import { useSideChat } from "./useSideChat";
import { settings, fakeThread, fakeTurn } from "./sideChatTestFixtures";

afterEach(cleanup);

function setup() {
  let nextId = 0;
  const client = {
    connectionStatus: "ready",
    startThread: vi.fn(async () => ({ thread: { ...fakeThread(), id: `side-${++nextId}` } })),
    startTurn: vi.fn(async () => ({ turn: fakeTurn("inProgress") })),
    interruptTurn: vi.fn(async () => ({})),
    unsubscribeThread: vi.fn(async () => ({ status: "unsubscribed" })),
  };
  const clientRef = { current: client as unknown as AppServerClient };
  const ensureConnected = vi.fn(async () => clientRef.current);
  const markThreadStopped = vi.fn();
  const hook = renderHook(({ parentId }) => useSideChat({
    clientRef, ensureConnected, mainThread: { ...fakeThread(), id: parentId }, mainTurns: [],
    settings, markThreadRunning: vi.fn(), markThreadStopped,
  }), { initialProps: { parentId: "main-a" } });
  return { ...hook, client, ensureConnected, markThreadStopped };
}

it("restores each parent's messages and draft, including background deltas and completion", async () => {
  const { result, rerender, client } = setup();
  await act(async () => { await result.current.openChat(); await result.current.send("hello A"); });
  act(() => result.current.setDraft("draft A"));
  rerender({ parentId: "main-b" });
  expect(result.current.thread).toBeNull();
  expect(result.current.draft).toBe("");
  await act(async () => { await result.current.openChat(); });
  act(() => result.current.setDraft("draft B"));
  act(() => {
    result.current.subscriptionHandlers.dispatch("side-1", {
      type: "agentDelta", notification: { threadId: "side-1", turnId: "turn-1", itemId: "reply", delta: "background reply" },
    });
  });
  expect(result.current.turns).toEqual([]);
  rerender({ parentId: "main-a" });
  expect(result.current.thread?.id).toBe("side-1");
  expect(result.current.draft).toBe("draft A");
  expect(result.current.running).toBe(true);
  expect(JSON.stringify(result.current.turns)).toContain("background reply");
  const completed = { ...result.current.turns[0], status: "completed" as const };
  rerender({ parentId: "main-b" });
  act(() => result.current.subscriptionHandlers.onTurnCompleted({ threadId: "side-1", turn: completed }));
  expect(result.current.draft).toBe("draft B");
  rerender({ parentId: "main-a" });
  expect(result.current.running).toBe(false);
  expect(JSON.stringify(result.current.turns)).toContain("background reply");
  await act(async () => { await result.current.openChat(); });
  expect(client.startThread).toHaveBeenCalledTimes(2);
  expect(client.interruptTurn).not.toHaveBeenCalled();
  expect(client.unsubscribeThread).not.toHaveBeenCalled();
});

it("retains a late-created chat without navigating the newly selected parent", async () => {
  const { client, result, rerender } = setup();
  let finish!: (response: { thread: Thread }) => void;
  client.startThread.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  let opening!: Promise<boolean>;
  await act(async () => { opening = result.current.openChat(); });
  rerender({ parentId: "main-b" });
  expect(result.current.submitting).toBe(false);
  expect(result.current.anySubmitting).toBe(true);
  await act(async () => { finish({ thread: { ...fakeThread(), id: "late-a" } }); expect(await opening).toBe(false); });
  expect(result.current.thread).toBeNull();
  expect(result.current.anySubmitting).toBe(false);
  rerender({ parentId: "main-a" });
  expect(result.current.thread?.id).toBe("late-a");
  expect(client.unsubscribeThread).not.toHaveBeenCalled();
});

it("settles a hidden send in its own entry without clearing another parent's draft", async () => {
  const { client, result, rerender } = setup();
  let finish!: (response: { turn: Turn }) => void;
  client.startTurn.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { await result.current.openChat(); });
  act(() => result.current.setDraft("send A"));
  let sending!: Promise<boolean>;
  await act(async () => { sending = result.current.sendDraft(); });
  rerender({ parentId: "main-b" });
  await act(async () => { await result.current.openChat(); });
  act(() => result.current.setDraft("keep B"));
  expect(result.current.anySubmitting).toBe(true);
  await act(async () => {
    result.current.subscriptionHandlers.onTurnCompleted({ threadId: "side-1", turn: fakeTurn("completed") });
    finish({ turn: fakeTurn("inProgress") });
    expect(await sending).toBe(true);
  });
  expect(result.current.draft).toBe("keep B");
  expect(result.current.turns).toEqual([]);
  rerender({ parentId: "main-a" });
  expect(result.current.draft).toBe("");
  expect(result.current.turns[0].status).toBe("completed");
  expect(result.current.running).toBe(false);
});

it("keeps hidden errors isolated and closes only the selected side chat", async () => {
  const { client, result, rerender } = setup();
  await act(async () => { await result.current.openChat(); });
  rerender({ parentId: "main-b" });
  await act(async () => { await result.current.openChat(); });
  act(() => result.current.subscriptionHandlers.onError({
    threadId: "side-1", turnId: "turn-1", willRetry: false,
    error: { message: "offline A", codexErrorInfo: null, additionalDetails: null, misalignment: null },
  }));
  expect(result.current.error).toBe("");
  await act(async () => { await result.current.close(); });
  expect(client.unsubscribeThread).toHaveBeenCalledExactlyOnceWith({ threadId: "side-2" });
  rerender({ parentId: "main-a" });
  expect(result.current.thread?.id).toBe("side-1");
  expect(result.current.error).toBe("offline A");
});

it.each(["reset", "unmount"])("releases all retained threads on %s and rejects their later events", async (action) => {
  const { client, result, rerender, unmount } = setup();
  await act(async () => { await result.current.openChat(); await result.current.send("A"); });
  rerender({ parentId: "main-b" });
  await act(async () => { await result.current.openChat(); });
  const handlers = result.current.subscriptionHandlers;
  await act(async () => { if (action === "reset") result.current.reset(); else unmount(); });
  expect(client.unsubscribeThread).toHaveBeenCalledWith({ threadId: "side-1" });
  expect(client.unsubscribeThread).toHaveBeenCalledWith({ threadId: "side-2" });
  expect(client.interruptTurn).toHaveBeenCalledWith({ threadId: "side-1", turnId: "turn-1" });
  expect(handlers.ownsThread("side-1")).toBe(false);
  if (action === "reset") {
    act(() => handlers.onTurnStarted({ threadId: "side-1", turn: fakeTurn("inProgress") }));
    rerender({ parentId: "main-a" });
    expect(result.current.thread).toBeNull();
    expect(result.current.running).toBe(false);
  }
});

it("bounds retained chats without silently evicting messages and frees capacity on close", async () => {
  const { client, result, rerender } = setup();
  for (let index = 0; index < 10; index++) {
    rerender({ parentId: `main-${index}` });
    await act(async () => { expect(await result.current.openChat()).toBe(true); });
  }
  rerender({ parentId: "overflow" });
  await act(async () => { expect(await result.current.openChat()).toBe(false); });
  expect(result.current.error).toContain("最多保留 10 个侧聊");
  expect(client.startThread).toHaveBeenCalledTimes(10);
  expect(client.unsubscribeThread).not.toHaveBeenCalled();
  rerender({ parentId: "main-0" });
  expect(result.current.thread?.id).toBe("side-1");
  await act(async () => { await result.current.close(); });
  rerender({ parentId: "overflow" });
  await act(async () => { expect(await result.current.openChat()).toBe(true); });
  expect(result.current.error).toBe("");
});
