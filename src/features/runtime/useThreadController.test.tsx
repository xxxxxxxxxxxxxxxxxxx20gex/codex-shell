// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { PermissionMode } from "../approvals/permissionModes";
import type { AppServerClient } from "./appServerClient";
import { useThreadController } from "./useThreadController";

function turn(id: string, status: Turn["status"] = "inProgress"): Turn {
  return {
    id,
    items: [],
    itemsView: "full",
    status,
    error: null,
    startedAt: 1,
    completedAt: status === "completed" ? 2 : null,
    durationMs: status === "completed" ? 1 : null,
  };
}

function thread(id: string, overrides: Partial<Thread> = {}): Thread {
  return {
    id,
    sessionId: id,
    forkedFromId: null,
    parentThreadId: null,
    preview: id,
    ephemeral: false,
    isPinned: false,
    modelProvider: "openai",
    createdAt: 1,
    updatedAt: 1,
    recencyAt: 1,
    status: { type: "idle" },
    path: null,
    cwd: "C:\\work",
    cliVersion: "test",
    source: "appServer",
    threadSource: null,
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    name: null,
    turns: [],
    ...overrides,
  };
}

function setup() {
  const reviewThread = thread("review-thread");
  const threads = new Map([
    ["thread-a", thread("thread-a")],
    ["thread-b", thread("thread-b")],
    ["review-thread", reviewThread],
  ]);
  const running = new Set<string>();
  const client = {
    listThreads: vi.fn(async () => ({ data: [...threads.values()], nextCursor: null })),
    readThread: vi.fn(async ({ threadId }: { threadId: string }) => ({ thread: threads.get(threadId)! })),
    resumeThread: vi.fn(async ({ threadId }: { threadId: string }) => ({ thread: threads.get(threadId)! })),
    unsubscribeThread: vi.fn(async () => ({})),
    startThread: vi.fn(async () => ({ thread: thread("thread-new") })),
    startTurn: vi.fn(async () => ({ turn: turn("turn-a") })),
    startReview: vi.fn(async ({ delivery }: { delivery: "inline" | "detached" }) => ({
      reviewThreadId: delivery === "inline" ? "thread-a" : "review-thread",
      turn: {
        ...turn("review-turn"),
        items: [{
          type: "userMessage" as const,
          id: "review-target",
          clientId: null,
          content: [{ type: "text" as const, text: "审查未提交更改", text_elements: [] }],
        }],
      },
    })),
  };
  const dispatch = vi.fn();
  const markThreadRunning = vi.fn((threadId: string) => running.add(threadId));
  const markThreadStopped = vi.fn((threadId: string) => running.delete(threadId));
  const props = {
    clientRef: { current: client as unknown as AppServerClient },
    ensureConnected: vi.fn(async () => client as unknown as AppServerClient),
    settings: {
      baseUrl: "https://example.test/v1",
      modelId: "gpt-test",
      capabilityTemplate: "openai-compatible-basic",
      reasoningEffort: "none" as const,
      verbosity: "low" as const,
    },
    permissionMode: "ask" as PermissionMode,
    workspacePath: "C:\\work",
    dispatch,
    submitting: false,
    setSubmitting: vi.fn(),
    setError: vi.fn(),
    markThreadRunning,
    markThreadStopped,
    markThreadStatus: vi.fn(),
    getRunningTurnId: vi.fn(() => "turn-a"),
    isThreadRunning: vi.fn((threadId: string) => running.has(threadId)),
  };
  return { client, dispatch, props, running };
}

describe("useThreadController", () => {
  it("reads a Session without subscribing and resumes only when sending", async () => {
    const { client, props } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
    });
    expect(client.readThread).toHaveBeenCalledWith({ threadId: "thread-a", includeTurns: true });
    expect(client.resumeThread).not.toHaveBeenCalled();

    await act(async () => {
      expect(await result.current.send("continue")).toBe(true);
    });
    expect(client.resumeThread).toHaveBeenCalledWith(expect.objectContaining({ threadId: "thread-a" }));
    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({
      threadId: "thread-a",
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
    }), undefined);
    expect(client.resumeThread.mock.invocationCallOrder[0]).toBeLessThan(client.startTurn.mock.invocationCallOrder[0]);
  });

  it("continues the same Session after a runtime reset", async () => {
    const { client, props } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
    });
    act(() => result.current.reset());
    await act(async () => {
      await result.current.openThread("thread-a");
      expect(await result.current.send("continue with another model")).toBe(true);
    });

    expect(client.startThread).not.toHaveBeenCalled();
    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({
      threadId: "thread-a",
      model: "gpt-test",
    }), undefined);
  });

  it("keeps full access overrides on every Turn", async () => {
    const { client, props } = setup();
    props.permissionMode = "full";
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      expect(await result.current.send("run unrestricted")).toBe(true);
    });

    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({
      approvalPolicy: "never",
      approvalsReviewer: "user",
      sandboxPolicy: { type: "dangerFullAccess" },
    }), undefined);
  });

  it("keeps a background running subscription until its Turn completes", async () => {
    const { client, props, running } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());
    await act(async () => {
      await result.current.openThread("thread-a");
      await result.current.send("run in background");
      await result.current.openThread("thread-b");
    });

    expect(running.has("thread-a")).toBe(true);
    expect(client.unsubscribeThread).not.toHaveBeenCalled();

    act(() => {
      result.current.onTurnCompleted({
        threadId: "thread-a",
        turn: turn("turn-a", "completed"),
      });
    });
    await waitFor(() => expect(client.unsubscribeThread).toHaveBeenCalledWith({ threadId: "thread-a" }));
  });

  it("retains a known fork parent when a refresh page only returns the child", async () => {
    const { client, props } = setup();
    const parent = thread("parent");
    const child = thread("child", { forkedFromId: parent.id, sessionId: parent.sessionId });
    client.listThreads
      .mockResolvedValueOnce({ data: [child, parent], nextCursor: null })
      .mockResolvedValueOnce({ data: [child], nextCursor: null });
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(result.current.history.map((item) => item.id)).toEqual(["child", "parent"]));

    await act(async () => {
      await result.current.refreshHistory();
    });

    expect(result.current.history.map((item) => item.id)).toEqual(["child", "parent"]);
  });

  it("does not retain active branch ancestors in the archived view", async () => {
    const { client, props } = setup();
    const parent = thread("parent");
    const archivedChild = thread("archived-child", {
      forkedFromId: parent.id,
      sessionId: parent.sessionId,
    });
    client.listThreads
      .mockResolvedValueOnce({ data: [parent], nextCursor: null })
      .mockResolvedValueOnce({ data: [archivedChild], nextCursor: null });
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(result.current.history.map((item) => item.id)).toEqual(["parent"]));

    act(() => result.current.showArchivedHistory(true));
    await waitFor(() => expect(result.current.history.map((item) => item.id)).toEqual(["archived-child"]));
  });

  it("falls back to resume when a paginated rollout cannot be read with turns", async () => {
    const { client, props, dispatch } = setup();
    client.readThread.mockRejectedValueOnce(new Error(
      "paginated threads do not support thread/read(includeTurns=true)",
    ));
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
    });

    expect(client.resumeThread).toHaveBeenCalledWith(expect.objectContaining({ threadId: "thread-a" }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "loadThread" }));
  });

  it("returns to active history before creating a new Session", async () => {
    const { client, props } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    act(() => result.current.showArchivedHistory(true));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalledWith(
      expect.objectContaining({ archived: true }),
    ));
    act(() => result.current.startNewTask());
    await waitFor(() => expect(result.current.historyArchived).toBe(false));

    await act(async () => {
      expect(await result.current.send("new Session")).toBe(true);
    });
    expect(result.current.historyArchived).toBe(false);
  });

  it("keeps inline Review context and releases the parent for detached Review", async () => {
    const { client, props, dispatch } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());
    await act(async () => {
      await result.current.openThread("thread-a");
      await result.current.startReview({ type: "uncommittedChanges" }, "inline");
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "turnStarted",
      turn: expect.objectContaining({ id: "review-turn" }),
    }));

    props.markThreadStopped("thread-a");
    await act(async () => {
      await result.current.startReview({ type: "uncommittedChanges" }, "detached");
    });
    expect(client.unsubscribeThread).toHaveBeenCalledWith({ threadId: "thread-a" });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "loadThread",
      thread: expect.objectContaining({ id: "review-thread" }),
    }));
  });
});
