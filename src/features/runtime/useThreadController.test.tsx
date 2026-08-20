// @vitest-environment happy-dom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { ApprovalReviewerMode, PermissionMode } from "../approvals/permissionModes";
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
    section: null,
    sectionEnteredAt: null,
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
    forkThread: vi.fn(async ({ threadId, lastTurnId }: { threadId: string; lastTurnId?: string }) => ({
      thread: thread("thread-fork", {
        forkedFromId: threadId,
        turns: lastTurnId ? [turn(lastTurnId, "completed")] : [],
      }),
    })),
    startTurn: vi.fn(async (params: unknown, collaboration?: unknown) => {
      void params;
      void collaboration;
      return { turn: turn("turn-a") };
    }),
    steerTurn: vi.fn(async () => ({ turnId: "turn-a" })),
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
  const runningTurns = new Map<string, {
    turnId: string | null;
    kind: "regular" | "review" | "compact" | "unknown";
    activeFlags: [];
  }>();
  const markThreadRunning = vi.fn((
    threadId: string,
    turnId: string | null,
    kind: "regular" | "review" | "compact" | "unknown",
  ) => {
    running.add(threadId);
    runningTurns.set(threadId, { turnId, kind, activeFlags: [] });
  });
  const markThreadStopped = vi.fn((threadId: string) => {
    running.delete(threadId);
    runningTurns.delete(threadId);
  });
  const props = {
    clientRef: { current: client as unknown as AppServerClient },
    ensureConnected: vi.fn(async () => client as unknown as AppServerClient),
    settings: {
      baseUrl: "https://example.test/v1",
      modelId: "gpt-test",
      reasoningEffort: "none" as const,
      reasoningSummary: "auto" as const,
      verbosity: "low" as const,
      serviceTier: "default" as const,
    },
    personalization: {
      customInstructions: "",
      theme: "dark" as const,
    },
    permissionMode: "workspace" as PermissionMode,
    approvalReviewer: "user" as ApprovalReviewerMode,
    projectCwd: "C:\\work",
    dispatch,
    submitting: false,
    setSubmitting: vi.fn(),
    setError: vi.fn(),
    markThreadRunning,
    markThreadStopped,
    markThreadStatus: vi.fn(),
    getRunningTurn: vi.fn((threadId: string) => runningTurns.get(threadId)),
    isThreadRunning: vi.fn((threadId: string) => running.has(threadId)),
  };
  return { client, dispatch, props, running, runningTurns };
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
    expect(client.resumeThread).toHaveBeenCalledWith({ threadId: "thread-a" });
    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({
      threadId: "thread-a",
      summary: "auto",
      serviceTier: "default",
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandboxPolicy: {
        type: "workspaceWrite",
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
    }), undefined);
    expect(props.markThreadRunning).toHaveBeenCalledWith("thread-a", "turn-a", "regular");
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

  it("maps read-only access to native Thread and Turn sandbox fields", async () => {
    const { client, props } = setup();
    props.permissionMode = "read";
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      expect(await result.current.send("inspect without writing")).toBe(true);
    });

    expect(client.startThread).toHaveBeenCalledWith(expect.objectContaining({
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandbox: "read-only",
    }));
    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({
      approvalPolicy: "on-request",
      approvalsReviewer: "user",
      sandboxPolicy: { type: "readOnly", networkAccess: false },
    }), undefined);
  });

  it("passes custom instructions only when creating a new Session", async () => {
    const { client, props } = setup();
    props.personalization = {
      customInstructions: "Answer with the conclusion first.",
      theme: "dark",
    };
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      expect(await result.current.send("start personalized Session")).toBe(true);
    });

    expect(client.startThread).toHaveBeenCalledWith(expect.objectContaining({
      developerInstructions: "Answer with the conclusion first.",
    }));
    expect(client.startTurn).toHaveBeenCalledWith(expect.not.objectContaining({
      developerInstructions: expect.anything(),
    }), undefined);
  });

  it("routes protected operations to automatic review without changing workspace access", async () => {
    const { client, props } = setup();
    props.permissionMode = "workspace";
    props.approvalReviewer = "auto_review";
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      expect(await result.current.send("edit the workspace")).toBe(true);
    });

    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({
      approvalPolicy: "on-request",
      approvalsReviewer: "auto_review",
      sandboxPolicy: expect.objectContaining({ type: "workspaceWrite" }),
    }), undefined);
  });

  it("explicitly tightens the Turn sandbox after leaving full access", async () => {
    const { client, props } = setup();
    props.permissionMode = "workspace";
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
      expect(await result.current.send("continue with workspace access")).toBe(true);
    });

    expect(client.startTurn).toHaveBeenCalledWith(expect.objectContaining({
      threadId: "thread-a",
      approvalPolicy: "on-request",
      sandboxPolicy: expect.objectContaining({ type: "workspaceWrite" }),
    }), undefined);
    expect(client.startThread).not.toHaveBeenCalled();
  });

  it("keeps explicit same-Turn steering available", async () => {
    const { client, props } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
      await result.current.send("检查项目");
      expect(await result.current.steer("先检查测试")).toBe(true);
    });

    expect(client.steerTurn).toHaveBeenCalledWith(expect.objectContaining({
      threadId: "thread-a",
      expectedTurnId: "turn-a",
      input: [{ type: "text", text: "先检查测试", text_elements: [] }],
    }));
    expect(client.startTurn).toHaveBeenCalledTimes(1);
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

  it("queues follow-ups per Session and starts them only after the previous Turn completes", async () => {
    const { client, props } = setup();
    client.startTurn
      .mockResolvedValueOnce({ turn: turn("turn-a") })
      .mockResolvedValueOnce({ turn: turn("turn-b") })
      .mockResolvedValueOnce({ turn: turn("turn-a-next") })
      .mockResolvedValueOnce({ turn: turn("turn-b-next") });
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
      await result.current.send("杭州");
      expect(result.current.queue("上海")).toBe(true);
      await result.current.openThread("thread-b");
      await result.current.send("北京");
      expect(result.current.queue("广州")).toBe(true);
    });

    expect(client.startTurn).toHaveBeenCalledTimes(2);
    act(() => result.current.onTurnCompleted({
      threadId: "thread-a",
      turn: turn("turn-a", "completed"),
    }));
    await waitFor(() => expect(client.startTurn).toHaveBeenCalledTimes(3));
    expect(client.startTurn.mock.calls[2][0]).toMatchObject({
      threadId: "thread-a",
      input: [{ type: "text", text: "上海" }],
    });

    act(() => result.current.onTurnCompleted({
      threadId: "thread-b",
      turn: turn("turn-b", "completed"),
    }));
    await waitFor(() => expect(client.startTurn).toHaveBeenCalledTimes(4));
    expect(client.startTurn.mock.calls[3][0]).toMatchObject({
      threadId: "thread-b",
      input: [{ type: "text", text: "广州" }],
    });
  });

  it("keeps queued messages after an interrupted Turn", async () => {
    const { client, props } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
      await result.current.send("杭州");
      expect(result.current.queue("上海")).toBe(true);
    });
    act(() => result.current.onTurnCompleted({
      threadId: "thread-a",
      turn: turn("turn-a", "interrupted"),
    }));

    await waitFor(() => expect(result.current.queuedTurns.map((input) => input.text)).toEqual(["上海"]));
    expect(client.startTurn).toHaveBeenCalledTimes(1);

    await act(async () => {
      expect(await result.current.resumeQueued()).toBe(true);
    });
    expect(client.startTurn).toHaveBeenCalledTimes(2);
    expect(client.startTurn.mock.calls[1][0]).toMatchObject({
      threadId: "thread-a",
      input: [{ type: "text", text: "上海" }],
    });
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

  it("forks a Session through the selected completed Turn", async () => {
    const { client, props, dispatch, running } = setup();
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
      running.add("thread-a");
      expect(await result.current.forkThread("thread-a", "turn-previous")).toBe(true);
    });

    expect(client.forkThread).toHaveBeenCalledWith({
      threadId: "thread-a",
      lastTurnId: "turn-previous",
      ephemeral: false,
    });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "loadThread",
      thread: expect.objectContaining({ id: "thread-fork", forkedFromId: "thread-a" }),
    }));
  });

  it("serializes Session actions before React can publish the pending state", async () => {
    const { client, props } = setup();
    let resolveFork!: (value: { thread: Thread }) => void;
    client.forkThread.mockImplementationOnce(() => new Promise((resolve) => {
      resolveFork = resolve;
    }));
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());
    await act(async () => result.current.openThread("thread-a"));

    let firstFork!: Promise<boolean>;
    let secondFork = true;
    let sendDuringFork = true;
    await act(async () => {
      firstFork = result.current.forkThread("thread-a", "turn-previous");
      secondFork = await result.current.forkThread("thread-a", "turn-other");
      sendDuringFork = await result.current.send("不应在分叉期间发送");
      await result.current.openThread("thread-b");
    });

    expect(secondFork).toBe(false);
    expect(sendDuringFork).toBe(false);
    expect(client.forkThread).toHaveBeenCalledTimes(1);
    expect(client.startTurn).not.toHaveBeenCalled();
    expect(client.readThread).not.toHaveBeenCalledWith({ threadId: "thread-b", includeTurns: true });

    await act(async () => {
      resolveFork({ thread: thread("thread-fork", { forkedFromId: "thread-a" }) });
      expect(await firstFork).toBe(true);
    });
  });

  it("ignores an obsolete fork response after the Session state is reset", async () => {
    const { client, props, dispatch } = setup();
    let resolveFork!: (value: { thread: Thread }) => void;
    client.forkThread.mockImplementationOnce(() => new Promise((resolve) => {
      resolveFork = resolve;
    }));
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());
    await act(async () => result.current.openThread("thread-a"));
    dispatch.mockClear();

    let pendingFork!: Promise<boolean>;
    act(() => {
      pendingFork = result.current.forkThread("thread-a", "turn-previous");
    });
    await waitFor(() => expect(client.forkThread).toHaveBeenCalledTimes(1));
    act(() => {
      result.current.reset();
    });
    await act(async () => {
      resolveFork({ thread: thread("stale-fork", { forkedFromId: "thread-a" }) });
      expect(await pendingFork).toBe(false);
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "clear" });
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({
      type: "loadThread",
      thread: expect.objectContaining({ id: "stale-fork" }),
    }));
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

    expect(client.resumeThread).toHaveBeenCalledWith({ threadId: "thread-a" });
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
    expect(props.markThreadRunning).toHaveBeenCalledWith("thread-a", "review-turn", "review");

    props.markThreadStopped("thread-a");
    await act(async () => {
      await result.current.startReview({ type: "uncommittedChanges" }, "detached");
    });
    expect(client.unsubscribeThread).toHaveBeenCalledWith({ threadId: "thread-a" });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "loadThread",
      thread: expect.objectContaining({ id: "review-thread" }),
    }));
    expect(props.markThreadRunning).toHaveBeenCalledWith("review-thread", "review-turn", "review");
  });

  it("restores an active Session as unknown instead of promising steering", async () => {
    const { client, props } = setup();
    client.readThread.mockResolvedValueOnce({
      thread: thread("thread-a", {
        status: { type: "active", activeFlags: [] },
        turns: [turn("turn-running")],
      }),
    });
    const { result } = renderHook(() => useThreadController(props));
    await waitFor(() => expect(client.listThreads).toHaveBeenCalled());

    await act(async () => {
      await result.current.openThread("thread-a");
    });

    expect(props.markThreadRunning).toHaveBeenCalledWith(
      "thread-a",
      "turn-running",
      "unknown",
    );
  });
});
