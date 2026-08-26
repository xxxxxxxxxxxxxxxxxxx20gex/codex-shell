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
  baseUrl: "https://example.test/v1",
  modelId: "gpt-test",
  reasoningEffort: "medium",
  reasoningSummary: "auto",
  verbosity: "medium",
  serviceTier: "default",
};

function fakeThread(): Thread {
  return {
    id: "side-thread",
    sessionId: "session",
    forkedFromId: null,
    parentThreadId: null,
    preview: "",
    ephemeral: true,
    section: null,
    sectionEnteredAt: null,
    projectId: null,
    modelProvider: "openai",
    createdAt: 0,
    updatedAt: 0,
    recencyAt: null,
    status: { type: "idle" },
    path: null,
    cwd: "C:\\work",
    cliVersion: "test",
    source: "appServer",
    threadSource: "codex-shell-side-chat",
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    name: null,
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

describe("useSideChat", () => {
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
