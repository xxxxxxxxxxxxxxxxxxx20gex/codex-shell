import { describe, expect, it, vi } from "vitest";
import { ServerInteractionStore } from "../interactions/serverInteractionStore";
import { AppServerClient } from "./appServerClient";
import { FakeTransport } from "./appServerClientTestSupport";
import { subscribeToSessionEvents } from "./sessionSubscriptions";
import type { AgentSessionAction } from "./sessionState";

type Handlers = Parameters<typeof subscribeToSessionEvents>[1];

function handlers(overrides: Partial<Handlers> = {}): Handlers {
  return {
    currentThreadId: () => "thread-active",
    dispatch: () => undefined,
    onTurnStarted: () => undefined,
    onTurnCompleted: () => undefined,
    onError: () => undefined,
    onThreadName: () => undefined,
    onThreadSettings: () => undefined,
    onThreadGoalUpdated: () => undefined,
    onThreadGoalCleared: () => undefined,
    onThreadStarted: () => undefined,
    onThreadStatus: () => undefined,
    onThreadArchived: () => undefined,
    onThreadDeleted: () => undefined,
    onThreadUnarchived: () => undefined,
    onThreadClosed: () => undefined,
    onServerRequestResolved: () => undefined,
    onWarning: () => undefined,
    onGuardianWarning: () => undefined,
    onConfigWarning: () => undefined,
    onDeprecation: () => undefined,
    onWorldWritableWarning: () => undefined,
    onSandboxSetupCompleted: () => undefined,
    onContextCompacted: () => undefined,
    onModelRerouted: () => undefined,
    onModelVerification: () => undefined,
    onModelSafetyBuffering: () => undefined,
    onMcpOauthLoginCompleted: () => undefined,
    onMcpServerStatusUpdated: () => undefined,
    onStopped: () => undefined,
    onRuntimeLog: () => undefined,
    onProtocolError: () => undefined,
    requestInteraction: async () => ({ decision: "decline" }),
    ...overrides,
  };
}

describe("session subscriptions", () => {
  it("routes activity notifications only to the active thread", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const actions: AgentSessionAction[] = [];
    const startedThreads: string[] = [];
    const completedThreads: string[] = [];
    const lifecycleEvents: string[] = [];
    const warnings: string[] = [];
    await client.start();
    const dispose = subscribeToSessionEvents(client, handlers({
      dispatch: (action) => actions.push(action),
      onTurnStarted: (notification) => startedThreads.push(notification.threadId),
      onTurnCompleted: (notification) => completedThreads.push(notification.threadId),
      onThreadStatus: (notification) => lifecycleEvents.push(
        `status:${notification.threadId}:${notification.status.type}`,
      ),
      onGuardianWarning: (notification) => warnings.push(notification.message),
      onMcpServerStatusUpdated: (notification) => lifecycleEvents.push(
        `mcp:${notification.name}:${notification.status}`,
      ),
    }));

    transport.emit({
      method: "turn/diff/updated",
      params: { threadId: "thread-other", turnId: "turn-1", diff: "ignored" },
    });
    transport.emit({
      method: "turn/diff/updated",
      params: { threadId: "thread-active", turnId: "turn-1", diff: "+kept" },
    });
    transport.emit({
      method: "turn/started",
      params: {
        threadId: "thread-background",
        turn: {
          id: "turn-background",
          items: [],
          itemsView: "full",
          status: "inProgress",
          error: null,
          startedAt: 1,
          completedAt: null,
          durationMs: null,
        },
      },
    });
    transport.emit({
      method: "turn/completed",
      params: {
        threadId: "thread-background",
        turn: {
          id: "turn-background",
          items: [],
          itemsView: "full",
          status: "completed",
          error: null,
          startedAt: 1,
          completedAt: 2,
          durationMs: 1000,
        },
      },
    });
    transport.emit({
      method: "thread/status/changed",
      params: { threadId: "thread-background", status: { type: "idle" } },
    });
    transport.emit({
      method: "guardianWarning",
      params: { threadId: "thread-background", message: "review required" },
    });
    transport.emit({
      method: "mcpServer/startupStatus/updated",
      params: {
        threadId: null,
        name: "docs",
        status: "ready",
        error: null,
        failureReason: null,
      },
    });

    expect(actions).toEqual([{
      type: "turnDiffUpdated",
      notification: { threadId: "thread-active", turnId: "turn-1", diff: "+kept" },
    }]);
    expect(startedThreads).toEqual(["thread-background"]);
    expect(completedThreads).toEqual(["thread-background"]);
    expect(lifecycleEvents).toEqual(["status:thread-background:idle", "mcp:docs:ready"]);
    expect(warnings).toEqual(["review required"]);
    dispose();
  });

  it("routes real reverse request ids and dismisses server-resolved interactions", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const store = new ServerInteractionStore();
    await client.start();
    const dispose = subscribeToSessionEvents(client, handlers({
      currentThreadId: () => "thread-1",
      onServerRequestResolved: (notification) => store.dismiss(notification.requestId),
      requestInteraction: store.request,
    }));

    transport.emit({
      id: "server-input-1",
      method: "item/tool/requestUserInput",
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "item-1",
        questions: [],
        autoResolutionMs: null,
      },
    });
    await vi.waitFor(() => expect(store.getSnapshot()).toMatchObject([
      { kind: "userInput", requestId: "server-input-1" },
    ]));

    transport.emit({
      method: "serverRequest/resolved",
      params: { threadId: "thread-1", requestId: "server-input-1" },
    });
    await vi.waitFor(() => expect(store.getSnapshot()).toEqual([]));
    expect(transport.sent.some((message) => message.id === "server-input-1")).toBe(false);

    dispose();
    store.dispose();
  });

  it("consumes authoritative thread state and active-thread process notifications", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const actions: AgentSessionAction[] = [];
    const settingsThreads: string[] = [];
    const goalEvents: string[] = [];
    await client.start();
    const dispose = subscribeToSessionEvents(client, handlers({
      dispatch: (action) => actions.push(action),
      onThreadSettings: (notification) => settingsThreads.push(notification.threadId),
      onThreadGoalUpdated: (notification) => goalEvents.push(`updated:${notification.threadId}`),
      onThreadGoalCleared: (notification) => goalEvents.push(`cleared:${notification.threadId}`),
    }));

    transport.emit({ method: "thread/settings/updated", params: { threadId: "thread-background", threadSettings: {} } });
    transport.emit({ method: "thread/goal/updated", params: { threadId: "thread-active", turnId: null, goal: {} } });
    transport.emit({ method: "thread/goal/cleared", params: { threadId: "thread-active" } });
    const reviewStarted = {
      threadId: "thread-active",
      turnId: "turn-1",
      reviewId: "review-1",
      startedAtMs: 100,
      targetItemId: "command-1",
      review: {},
      action: {},
    };
    const reviewCompleted = { ...reviewStarted, completedAtMs: 200, decisionSource: "agent" };
    transport.emit({ method: "item/autoApprovalReview/started", params: reviewStarted });
    transport.emit({ method: "item/autoApprovalReview/completed", params: reviewCompleted });
    transport.emit({
      method: "item/commandExecution/terminalInteraction",
      params: { threadId: "thread-other", turnId: "turn-1", itemId: "command-1", processId: "42", stdin: "ignored" },
    });
    transport.emit({
      method: "item/commandExecution/terminalInteraction",
      params: { threadId: "thread-active", turnId: "turn-1", itemId: "command-1", processId: "42", stdin: "secret" },
    });

    expect(settingsThreads).toEqual(["thread-background"]);
    expect(goalEvents).toEqual(["updated:thread-active", "cleared:thread-active"]);
    expect(actions).toEqual([
      { type: "autoApprovalReviewStarted", notification: reviewStarted },
      { type: "autoApprovalReviewCompleted", notification: reviewCompleted },
      {
        type: "terminalInteraction",
        notification: {
          threadId: "thread-active",
          turnId: "turn-1",
          itemId: "command-1",
          processId: "42",
          stdin: "secret",
        },
      },
    ]);
    dispose();
  });

  it("isolates side-chat deltas while preserving global turn lifecycle tracking", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const mainActions: AgentSessionAction[] = [];
    const sideActions: AgentSessionAction[] = [];
    const globalStarted: string[] = [];
    const sideStarted: string[] = [];
    await client.start();
    const dispose = subscribeToSessionEvents(client, handlers({
      dispatch: (action) => mainActions.push(action),
      onTurnStarted: (notification) => globalStarted.push(notification.threadId),
      sideChat: {
        currentThreadId: () => "thread-side",
        dispatch: (action) => sideActions.push(action),
        onTurnStarted: (notification) => sideStarted.push(notification.threadId),
        onTurnCompleted: () => undefined,
        onError: () => undefined,
      },
    }));

    transport.emit({
      method: "item/agentMessage/delta",
      params: { threadId: "thread-side", turnId: "turn-side", itemId: "message-side", delta: "side" },
    });
    transport.emit({
      method: "item/agentMessage/delta",
      params: { threadId: "thread-active", turnId: "turn-main", itemId: "message-main", delta: "main" },
    });
    transport.emit({
      method: "turn/started",
      params: {
        threadId: "thread-side",
        turn: {
          id: "turn-side",
          items: [],
          itemsView: "full",
          status: "inProgress",
          error: null,
          startedAt: 1,
          completedAt: null,
          durationMs: null,
        },
      },
    });

    expect(mainActions).toEqual([{
      type: "agentDelta",
      notification: { threadId: "thread-active", turnId: "turn-main", itemId: "message-main", delta: "main" },
    }]);
    expect(sideActions).toEqual([{
      type: "agentDelta",
      notification: { threadId: "thread-side", turnId: "turn-side", itemId: "message-side", delta: "side" },
    }]);
    expect(globalStarted).toEqual(["thread-side"]);
    expect(sideStarted).toEqual(["thread-side"]);
    dispose();
  });
});
