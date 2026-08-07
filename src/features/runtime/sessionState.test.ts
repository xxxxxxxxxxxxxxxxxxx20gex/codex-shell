import { describe, expect, it } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";
import { agentSessionReducer, initialAgentSessionState } from "./sessionState";

function turn(id: string, items: ThreadItem[] = []): Turn {
  return {
    id,
    items,
    itemsView: "full",
    status: "inProgress",
    error: null,
    startedAt: 1,
    completedAt: null,
    durationMs: null,
  };
}

function thread(turns: Turn[] = []): Thread {
  return {
    id: "thread-1",
    sessionId: "thread-1",
    forkedFromId: null,
    parentThreadId: null,
    preview: "历史任务",
    ephemeral: false,
    isPinned: false,
    modelProvider: "openai",
    createdAt: 1,
    updatedAt: 2,
    recencyAt: 2,
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
    turns,
  };
}

function userMessage(id: string, text: string): ThreadItem {
  return {
    type: "userMessage",
    id,
    clientId: null,
    content: [{ type: "text", text, text_elements: [] }],
  };
}

describe("agentSessionReducer", () => {
  it("loads persisted multi-turn history", () => {
    const first = { ...turn("turn-1", [userMessage("user-1", "第一问")]), status: "completed" } as Turn;
    const second = { ...turn("turn-2", [userMessage("user-2", "第二问")]), status: "completed" } as Turn;

    const state = agentSessionReducer(initialAgentSessionState, {
      type: "loadThread",
      thread: thread([first, second]),
    });

    expect(state.turns).toEqual([first, second]);
  });

  it("appends submitted turns without replacing earlier turns", () => {
    const first = turn("turn-1", [userMessage("user-1", "第一问")]);
    const loaded = agentSessionReducer(initialAgentSessionState, {
      type: "loadThread",
      thread: thread([first]),
    });

    const state = agentSessionReducer(loaded, {
      type: "turnSubmitted",
      turn: turn("turn-2"),
      userText: "第二问",
    });

    expect(state.turns.map((item) => item.id)).toEqual(["turn-1", "turn-2"]);
    expect(state.turns[1].items[0]).toMatchObject({ type: "userMessage" });
  });

  it("replaces the optimistic user item when the persisted item starts", () => {
    const submitted = agentSessionReducer(initialAgentSessionState, {
      type: "turnSubmitted",
      turn: turn("turn-1"),
      userText: "真实问题",
    });
    const persisted = userMessage("user-1", "真实问题");

    const state = agentSessionReducer(submitted, {
      type: "itemStarted",
      notification: { threadId: "thread-1", turnId: "turn-1", item: persisted, startedAtMs: 1 },
    });

    expect(state.turns[0].items).toEqual([persisted]);
  });

  it("accumulates streamed agent message deltas", () => {
    const submitted = agentSessionReducer(initialAgentSessionState, {
      type: "turnSubmitted",
      turn: turn("turn-1"),
      userText: "问题",
    });
    const first = agentSessionReducer(submitted, {
      type: "agentDelta",
      notification: { threadId: "thread-1", turnId: "turn-1", itemId: "agent-1", delta: "你" },
    });
    const second = agentSessionReducer(first, {
      type: "agentDelta",
      notification: { threadId: "thread-1", turnId: "turn-1", itemId: "agent-1", delta: "好" },
    });

    const items = second.turns[0].items;
    expect(items[items.length - 1]).toMatchObject({ type: "agentMessage", text: "你好" });
  });

  it("uses the completed turn as the final persisted state", () => {
    const submitted = agentSessionReducer(initialAgentSessionState, {
      type: "turnSubmitted",
      turn: turn("turn-1"),
      userText: "问题",
    });
    const completed = {
      ...turn("turn-1", [
        userMessage("user-1", "问题"),
        { type: "agentMessage", id: "agent-1", text: "答案", phase: null, memoryCitation: null },
      ]),
      status: "completed",
      completedAt: 2,
    } as Turn;

    const state = agentSessionReducer(submitted, {
      type: "turnCompleted",
      notification: { threadId: "thread-1", turn: completed },
    });

    expect(state.turns).toEqual([completed]);
  });

  it("keeps the optimistic user message when completion omits it", () => {
    const submitted = agentSessionReducer(initialAgentSessionState, {
      type: "turnSubmitted",
      turn: turn("turn-1"),
      userText: "不能丢失的问题",
    });
    const completed = {
      ...turn("turn-1", [
        { type: "agentMessage", id: "agent-1", text: "答案", phase: null, memoryCitation: null },
      ]),
      status: "completed",
      completedAt: 2,
    } as Turn;

    const state = agentSessionReducer(submitted, {
      type: "turnCompleted",
      notification: { threadId: "thread-1", turn: completed },
    });

    expect(state.turns[0].items.map((item) => item.type)).toEqual(["userMessage", "agentMessage"]);
  });

  it("accumulates command output and the latest turn diff", () => {
    const command: ThreadItem = {
      type: "commandExecution",
      id: "command-1",
      pluginId: null,
      scriptPath: null,
      command: "pnpm test",
      cwd: "C:\\work",
      processId: null,
      source: "agent",
      status: "inProgress",
      commandActions: [],
      aggregatedOutput: null,
      exitCode: null,
      durationMs: null,
    };
    const loaded = agentSessionReducer(initialAgentSessionState, {
      type: "loadThread",
      thread: thread([turn("turn-1", [command])]),
    });
    const streamed = agentSessionReducer(loaded, {
      type: "commandDelta",
      notification: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "command-1",
        delta: "16 tests passed",
      },
    });
    const state = agentSessionReducer(streamed, {
      type: "turnDiffUpdated",
      notification: { threadId: "thread-1", turnId: "turn-1", diff: "+new line" },
    });

    expect(state.turns[0].items[0]).toEqual({ ...command, aggregatedOutput: "16 tests passed" });
    expect(state.diffsByTurnId).toEqual({ "turn-1": "+new line" });
  });

  it("reconstructs historical diffs from persisted file change items", () => {
    const fileChange: ThreadItem = {
      type: "fileChange",
      id: "change-1",
      status: "completed",
      changes: [{ path: "src/App.tsx", kind: { type: "update", move_path: null }, diff: "+updated" }],
    };

    const state = agentSessionReducer(initialAgentSessionState, {
      type: "loadThread",
      thread: thread([turn("turn-1", [fileChange])]),
    });

    expect(state.diffsByTurnId["turn-1"]).toContain("diff --git a/src/App.tsx b/src/App.tsx");
    expect(state.diffsByTurnId["turn-1"]).toContain("+updated");
  });

  it("keeps the latest app-server token usage for the active session", () => {
    const tokenUsage = {
      total: {
        totalTokens: 180_000,
        inputTokens: 170_000,
        cachedInputTokens: 90_000,
        cacheWriteInputTokens: 0,
        outputTokens: 10_000,
        reasoningOutputTokens: 4_000,
      },
      last: {
        totalTokens: 64_000,
        inputTokens: 60_000,
        cachedInputTokens: 30_000,
        cacheWriteInputTokens: 0,
        outputTokens: 4_000,
        reasoningOutputTokens: 1_500,
      },
      modelContextWindow: 128_000,
    };

    const state = agentSessionReducer(initialAgentSessionState, {
      type: "tokenUsageUpdated",
      notification: { threadId: "thread-1", turnId: "turn-1", tokenUsage },
    });

    expect(state.tokenUsage).toEqual(tokenUsage);
  });
});
