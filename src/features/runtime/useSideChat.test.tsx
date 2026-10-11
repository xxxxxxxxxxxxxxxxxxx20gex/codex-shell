// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AppServerClient } from "./appServerClient";
import type { ModelSettings } from "../models/types";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnStartedNotification } from "../../generated/app-server/v2/TurnStartedNotification";
import { useSideChat } from "./useSideChat";

const settings: ModelSettings = {
  modelId: "gpt-test",
  reasoningEffort: "medium",
  reasoningSummary: "auto",
  verbosity: "medium",
  serviceTier: "default",
};

function fakeThread(): Thread {
  return {
    id: "side-thread",
    environments: null,
    sessionId: "session",
    forkedFromId: null,
    parentThreadId: null,
    preview: "",
    ephemeral: true,
    section: null,
    sectionEnteredAt: null,
    projectId: null,
    historyMode: "legacy",
    extra: null,
    model: null,
    reasoningEffort: null,
    canAcceptDirectInput: null,
    modelProvider: "openai",
    createdAt: 0,
    updatedAt: 0,
    recencyAt: null,
    status: { type: "idle" },
    path: null,
    cwd: "C:\\work",
    cliVersion: "test",
    originator: null,
    source: "appServer",
    threadSource: "codex-shell-side-chat",
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    name: null,
    daybreakEnabled: null,
    turns: [],
  };
}

function fakeTurn(status: Turn["status"]): Turn {
  return {
    id: "turn-1",
    items: [],
    itemsView: "full",
    status,
    error: null,
    startedAt: 1,
    completedAt: null,
    durationMs: null,
  };
}

function setup() {
  const interruptTurn = vi.fn(async () => ({}));
  const unsubscribeThread = vi.fn(async () => ({ status: "unsubscribed" }));
  const client = {
    connectionStatus: "ready",
    startThread: vi.fn(async () => ({ thread: fakeThread() })),
    interruptTurn,
    unsubscribeThread,
  } as unknown as AppServerClient;
  const ensureConnected = vi.fn(async () => client);
  const clientRef = { current: client };
  const { result } = renderHook(() => useSideChat({
    clientRef,
    ensureConnected,
    mainThread: null,
    mainTurns: [],
    settings,
    markThreadRunning: vi.fn(),
    markThreadStopped: vi.fn(),
  }));
  return { client, ensureConnected, interruptTurn, unsubscribeThread, result };
}

it("forks paginated side chat without requesting copied history", async () => {
  const forkThread = vi.fn(async (params: { excludeTurns?: boolean }) => {
    if (!params.excludeTurns) throw new Error("ephemeral paginated thread/fork requires excludeTurns");
    return { thread: fakeThread() };
  });
  const client = { forkThread } as unknown as AppServerClient;
  const { result } = renderHook(() => useSideChat({
    clientRef: { current: client }, ensureConnected: async () => client,
    mainThread: { ...fakeThread(), id: "main", historyMode: "paginated", ephemeral: false },
    mainTurns: [fakeTurn("completed")], settings, markThreadRunning: vi.fn(), markThreadStopped: vi.fn(),
  }));
  await act(async () => { expect(await result.current.openChat()).toBe(true); });
  expect(forkThread).toHaveBeenCalledWith(expect.objectContaining({ threadId: "main", ephemeral: true, excludeTurns: true }));
  expect(result.current.thread?.id).toBe("side-thread");
});

describe("useSideChat", () => {
  it.each(["switch", "reset", "close", "unmount"])("discards late creation after %s", async (action) => {
    let finish!: (value: { thread: Thread }) => void;
    const client = { connectionStatus: "ready", startThread: vi.fn(() => new Promise<{ thread: Thread }>(r => { finish = r; })), unsubscribeThread: vi.fn(async () => ({})) };
    const hook = renderHook(({ mainThread }: { mainThread: Thread | null }) => useSideChat({
      clientRef: { current: client as unknown as AppServerClient }, ensureConnected: async () => client as unknown as AppServerClient,
      mainThread, mainTurns: [], settings, markThreadRunning: vi.fn(), markThreadStopped: vi.fn(),
    }), { initialProps: { mainThread: null as Thread | null } });
    let opening!: Promise<boolean>;
    await act(async () => { opening = hook.result.current.openChat(); });
    await act(async () => {
      if (action === "switch") hook.rerender({ mainThread: { ...fakeThread(), id: "new-main" } });
      if (action === "reset") hook.result.current.reset();
      if (action === "close") await hook.result.current.close();
      if (action === "unmount") hook.unmount();
    });
    await act(async () => { finish({ thread: fakeThread() }); expect(await opening).toBe(false); });
    expect(client.unsubscribeThread).toHaveBeenCalledWith({ threadId: "side-thread" });
    expect(hook.result.current.thread).toBeNull();
  });

  it("does not let old cleanup clear a reopened thread", async () => {
    const { client, result } = setup();
    await act(async () => { await result.current.openChat(); });
    let finish!: () => void;
    vi.mocked(client.unsubscribeThread).mockImplementationOnce(() => new Promise(r => { finish = () => r({ status: "unsubscribed" }); }));
    let closing!: Promise<void>;
    act(() => { closing = result.current.close(); });
    await act(async () => { await result.current.openChat(); });
    await act(async () => { finish(); await closing; });
    expect(result.current.thread?.id).toBe("side-thread");
  });

  it("interrupts a late submitted turn without restoring closed state", async () => {
    const { client, result } = setup();
    let finish!: (value: { turn: Turn }) => void;
    client.startTurn = vi.fn(() => new Promise<{ turn: Turn }>(r => { finish = r; }));
    await act(async () => { await result.current.openChat(); });
    let sending!: Promise<boolean>;
    await act(async () => { sending = result.current.send("hello"); });
    await act(async () => { await result.current.close(); });
    await act(async () => { finish({ turn: fakeTurn("inProgress") }); expect(await sending).toBe(false); });
    expect(result.current.turns).toEqual([]);
    expect(client.interruptTurn).toHaveBeenCalledWith({ threadId: "side-thread", turnId: "turn-1" });
  });

  it("sends answers via steer while active and start when idle, allowing retry after failure", async () => {
    const { client, result } = setup();
    client.steerTurn = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ turnId: "turn-1" });
    client.startTurn = vi.fn(async () => ({ turn: fakeTurn("inProgress") }));
    await act(async () => { await result.current.openChat(); });
    act(() => result.current.subscriptionHandlers.onTurnStarted({ threadId: "side-thread", turn: fakeTurn("inProgress") }));
    await act(async () => { await expect(result.current.answerQuestions("answer")).rejects.toThrow("offline"); });
    await act(async () => { expect(await result.current.answerQuestions("answer")).toBe(true); });
    expect(client.steerTurn).toHaveBeenLastCalledWith(expect.objectContaining({ threadId: "side-thread", expectedTurnId: "turn-1" }));
    act(() => result.current.subscriptionHandlers.onTurnCompleted({ threadId: "side-thread", turn: fakeTurn("completed") }));
    await act(async () => { expect(await result.current.answerQuestions("next answer")).toBe(true); });
    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({ threadId: "side-thread", sandboxPolicy: { type: "readOnly", networkAccess: false } }));
  });
  it("provides host context when creating a side chat without personalization", async () => {
    const { client, result } = setup();
    await act(async () => { await result.current.openChat(); });
    expect(client.startThread).toHaveBeenCalledWith(expect.objectContaining({
      developerInstructions: expect.stringContaining("你当前运行于 Codex Shell"),
    }));
  });

  it("includes host context and personalization when forking a side chat", async () => {
    const client = {
      forkThread: vi.fn(async () => ({ thread: fakeThread() })),
    } as unknown as AppServerClient;
    const { result } = renderHook(() => useSideChat({
      clientRef: { current: client },
      ensureConnected: async () => client,
      mainThread: fakeThread(),
      mainTurns: [fakeTurn("completed")],
      settings,
      personalization: { customInstructions: "先给结论", theme: "dark" },
      markThreadRunning: vi.fn(),
      markThreadStopped: vi.fn(),
    }));
    await act(async () => { expect(await result.current.openChat()).toBe(true); });
    expect(client.forkThread).toHaveBeenCalledWith(expect.objectContaining({
      developerInstructions: expect.stringContaining("</cs_host_context>\n\n先给结论"),
      ephemeral: true,
      sandbox: "read-only",
    }));
  });

  it("interrupts an active turn before unsubscribing on close", async () => {
    const { interruptTurn, unsubscribeThread, result } = setup();
    await act(async () => {
      await result.current.openChat();
    });
    act(() => {
      result.current.subscriptionHandlers.onTurnStarted({
        threadId: "side-thread",
        turn: fakeTurn("inProgress"),
      } as TurnStartedNotification);
    });

    await act(async () => {
      await result.current.close();
    });

    expect(interruptTurn).toHaveBeenCalledWith({ threadId: "side-thread", turnId: "turn-1" });
    expect(unsubscribeThread).toHaveBeenCalledWith({ threadId: "side-thread" });
    expect(interruptTurn.mock.invocationCallOrder[0]).toBeLessThan(unsubscribeThread.mock.invocationCallOrder[0]);
    expect(result.current.thread).toBeNull();
    expect(result.current.turns).toEqual([]);
  });

  it("does not reconnect a stopped Runtime just to close the side chat", async () => {
    const { client, ensureConnected, result } = setup();
    (client as unknown as { connectionStatus: string }).connectionStatus = "stopped";
    await act(async () => {
      await result.current.openChat();
    });
    ensureConnected.mockClear();

    await act(async () => {
      await result.current.close();
    });

    expect(ensureConnected).not.toHaveBeenCalled();
    expect(result.current.thread).toBeNull();
  });

  it("closes the ephemeral thread when the main Session changes", async () => {
    const { client, result, rerender } = (() => {
      const interruptTurn = vi.fn(async () => ({}));
      const unsubscribeThread = vi.fn(async () => ({ status: "unsubscribed" }));
      const client = {
        connectionStatus: "ready",
        startThread: vi.fn(async () => ({ thread: fakeThread() })),
        interruptTurn,
        unsubscribeThread,
      } as unknown as AppServerClient;
      const hook = renderHook(({ mainThread }: { mainThread: Thread | null }) => useSideChat({
        clientRef: { current: client },
        ensureConnected: vi.fn(async () => client),
        mainThread,
        mainTurns: [],
        settings,
        markThreadRunning: vi.fn(),
        markThreadStopped: vi.fn(),
      }), { initialProps: { mainThread: null as Thread | null } });
      return { client, result: hook.result, rerender: hook.rerender };
    })();

    await act(async () => {
      await result.current.openChat();
    });
    await act(async () => {
      rerender({ mainThread: fakeThread() });
    });

    expect(result.current.thread).toBeNull();
    expect(client.unsubscribeThread).toHaveBeenCalledWith({ threadId: "side-thread" });
  });
});
