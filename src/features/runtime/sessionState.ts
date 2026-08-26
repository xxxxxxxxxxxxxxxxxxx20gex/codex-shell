import type { AgentMessageDeltaNotification } from "../../generated/app-server/v2/AgentMessageDeltaNotification";
import type { CommandExecutionOutputDeltaNotification } from "../../generated/app-server/v2/CommandExecutionOutputDeltaNotification";
import type { FileChangePatchUpdatedNotification } from "../../generated/app-server/v2/FileChangePatchUpdatedNotification";
import type { ItemCompletedNotification } from "../../generated/app-server/v2/ItemCompletedNotification";
import type { ItemStartedNotification } from "../../generated/app-server/v2/ItemStartedNotification";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { PlanDeltaNotification } from "../../generated/app-server/v2/PlanDeltaNotification";
import type { ReasoningSummaryTextDeltaNotification } from "../../generated/app-server/v2/ReasoningSummaryTextDeltaNotification";
import type { ReasoningTextDeltaNotification } from "../../generated/app-server/v2/ReasoningTextDeltaNotification";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { ThreadSettings } from "../../generated/app-server/v2/ThreadSettings";
import type { ThreadGoal } from "../../generated/app-server/v2/ThreadGoal";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { ThreadStatus } from "../../generated/app-server/v2/ThreadStatus";
import type { ThreadTokenUsage } from "../../generated/app-server/v2/ThreadTokenUsage";
import type { ThreadTokenUsageUpdatedNotification } from "../../generated/app-server/v2/ThreadTokenUsageUpdatedNotification";
import type { ItemGuardianApprovalReviewCompletedNotification } from "../../generated/app-server/v2/ItemGuardianApprovalReviewCompletedNotification";
import type { ItemGuardianApprovalReviewStartedNotification } from "../../generated/app-server/v2/ItemGuardianApprovalReviewStartedNotification";
import type { TerminalInteractionNotification } from "../../generated/app-server/v2/TerminalInteractionNotification";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnCompletedNotification } from "../../generated/app-server/v2/TurnCompletedNotification";
import type { TurnDiffUpdatedNotification } from "../../generated/app-server/v2/TurnDiffUpdatedNotification";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import type { UserInput } from "../../generated/app-server/v2/UserInput";
import { userMessagePresentation } from "./userMessagePresentation";

const MAX_VISIBLE_TURNS = 200;
const LOCAL_USER_PREFIX = "local-user:";

export interface AgentSessionState {
  thread: Thread | null;
  turns: Turn[];
  diffsByTurnId: Record<string, string>;
  plansByTurnId: Record<string, TurnPlanUpdatedNotification>;
  activeItemTurnIds: Record<string, string>;
  mcpProgressByItemId: Record<string, McpToolCallProgressNotification>;
  tokenUsage: ThreadTokenUsage | null;
  threadSettings: ThreadSettings | null;
  threadGoal: ThreadGoal | null;
  processEventsByTurnId: Record<string, ThreadProcessEvent[]>;
}

/** Safe, display-oriented summaries of unstable runtime notifications. */
export type ThreadProcessEvent =
  | {
      kind: "autoApprovalReview";
      reviewId: string;
      status: "started" | "completed";
      startedAtMs: number;
      completedAtMs?: number;
      reviewStatus: string;
      riskLevel: string | null;
      decisionSource?: string;
      targetItemId: string | null;
    }
  | {
      kind: "terminalInteraction";
      itemId: string;
      processId: string;
      stdinLength: number;
    };

export type AgentSessionAction =
  | { type: "clear" }
  | { type: "clearLiveProgress" }
  | { type: "loadThread"; thread: Thread }
  | { type: "updateThread"; thread: Thread }
  | { type: "renameThread"; threadId: string; name: string | null }
  | { type: "threadStatusChanged"; threadId: string; status: ThreadStatus }
  | { type: "turnSubmitted"; turn: Turn; userInput: UserInput[]; submittedAt: number }
  | { type: "turnStarted"; turn: Turn; startedAt: number }
  | { type: "itemStarted"; notification: ItemStartedNotification }
  | { type: "itemCompleted"; notification: ItemCompletedNotification }
  | { type: "agentDelta"; notification: AgentMessageDeltaNotification }
  | { type: "planDelta"; notification: PlanDeltaNotification }
  | { type: "commandDelta"; notification: CommandExecutionOutputDeltaNotification }
  | { type: "mcpProgress"; notification: McpToolCallProgressNotification }
  | { type: "reasoningSummaryDelta"; notification: ReasoningSummaryTextDeltaNotification }
  | { type: "reasoningTextDelta"; notification: ReasoningTextDeltaNotification }
  | { type: "fileChangeUpdated"; notification: FileChangePatchUpdatedNotification }
  | { type: "turnDiffUpdated"; notification: TurnDiffUpdatedNotification }
  | { type: "turnPlanUpdated"; notification: TurnPlanUpdatedNotification }
  | { type: "tokenUsageUpdated"; notification: ThreadTokenUsageUpdatedNotification }
  | { type: "threadSettingsUpdated"; notification: { threadId: string; threadSettings: ThreadSettings } }
  | { type: "threadGoalUpdated"; notification: { threadId: string; goal: ThreadGoal } }
  | { type: "threadGoalCleared"; threadId: string }
  | { type: "autoApprovalReviewStarted"; notification: ItemGuardianApprovalReviewStartedNotification }
  | { type: "autoApprovalReviewCompleted"; notification: ItemGuardianApprovalReviewCompletedNotification }
  | { type: "terminalInteraction"; notification: TerminalInteractionNotification }
  | { type: "turnCompleted"; notification: TurnCompletedNotification; completedAt: number };

export const initialAgentSessionState: AgentSessionState = {
  thread: null,
  turns: [],
  diffsByTurnId: {},
  plansByTurnId: {},
  activeItemTurnIds: {},
  mcpProgressByItemId: {},
  tokenUsage: null,
  threadSettings: null,
  threadGoal: null,
  processEventsByTurnId: {},
};

function boundedTurns(turns: Turn[]) {
  return turns.slice(-MAX_VISIBLE_TURNS);
}

function entriesForVisibleTurns<T>(
  entries: Record<string, T>,
  turns: Turn[],
): Record<string, T> {
  const visibleTurnIds = new Set(turns.map((turn) => turn.id));
  return Object.fromEntries(
    Object.entries(entries).filter(([turnId]) => visibleTurnIds.has(turnId)),
  );
}

function withTurns(state: AgentSessionState, turns: Turn[]): AgentSessionState {
  const visibleTurns = boundedTurns(turns);
  if (visibleTurns.length === turns.length) return { ...state, turns: visibleTurns };
  const visibleTurnIds = new Set(visibleTurns.map((turn) => turn.id));
  return {
    ...state,
    turns: visibleTurns,
    diffsByTurnId: entriesForVisibleTurns(state.diffsByTurnId, visibleTurns),
    plansByTurnId: entriesForVisibleTurns(state.plansByTurnId, visibleTurns),
    activeItemTurnIds: Object.fromEntries(
      Object.entries(state.activeItemTurnIds).filter(([, turnId]) => visibleTurnIds.has(turnId)),
    ),
    mcpProgressByItemId: Object.fromEntries(
      Object.entries(state.mcpProgressByItemId)
        .filter(([, notification]) => visibleTurnIds.has(notification.turnId)),
    ),
    processEventsByTurnId: Object.fromEntries(
      Object.entries(state.processEventsByTurnId).filter(([turnId]) => visibleTurnIds.has(turnId)),
    ),
  };
}

function appendProcessEvent(
  eventsByTurnId: Record<string, ThreadProcessEvent[]>,
  turnId: string,
  event: ThreadProcessEvent,
) {
  const current = eventsByTurnId[turnId] ?? [];
  return { ...eventsByTurnId, [turnId]: [...current, event].slice(-100) };
}

function upsertReviewStarted(
  eventsByTurnId: Record<string, ThreadProcessEvent[]>,
  notification: ItemGuardianApprovalReviewStartedNotification,
) {
  const events = eventsByTurnId[notification.turnId] ?? [];
  const event: ThreadProcessEvent = {
    kind: "autoApprovalReview",
    reviewId: notification.reviewId,
    status: "started",
    startedAtMs: notification.startedAtMs,
    reviewStatus: notification.review.status,
    riskLevel: notification.review.riskLevel,
    targetItemId: notification.targetItemId,
  };
  const existingIndex = events.findIndex(
    (current) => current.kind === "autoApprovalReview" && current.reviewId === notification.reviewId,
  );
  if (existingIndex < 0) return appendProcessEvent(eventsByTurnId, notification.turnId, event);
  const existing = events[existingIndex];
  if (existing.kind === "autoApprovalReview" && existing.status === "completed") {
    return eventsByTurnId;
  }
  const next = [...events];
  next[existingIndex] = event;
  return { ...eventsByTurnId, [notification.turnId]: next };
}

function updateReviewEvent(
  eventsByTurnId: Record<string, ThreadProcessEvent[]>,
  notification: ItemGuardianApprovalReviewCompletedNotification,
) {
  const events = eventsByTurnId[notification.turnId] ?? [];
  const existing = events.some(
    (event) => event.kind === "autoApprovalReview" && event.reviewId === notification.reviewId,
  );
  const next = events.map((event) => event.kind === "autoApprovalReview" && event.reviewId === notification.reviewId
    ? {
        ...event,
        status: "completed" as const,
        completedAtMs: notification.completedAtMs,
        reviewStatus: notification.review.status,
        riskLevel: notification.review.riskLevel,
        decisionSource: notification.decisionSource,
      }
    : event);
  if (existing) return { ...eventsByTurnId, [notification.turnId]: next };
  return appendProcessEvent(eventsByTurnId, notification.turnId, {
    kind: "autoApprovalReview",
    reviewId: notification.reviewId,
    status: "completed",
    startedAtMs: notification.startedAtMs,
    completedAtMs: notification.completedAtMs,
    reviewStatus: notification.review.status,
    riskLevel: notification.review.riskLevel,
    decisionSource: notification.decisionSource,
    targetItemId: notification.targetItemId,
  });
}

function upsertTurn(turns: Turn[], turn: Turn) {
  const existingIndex = turns.findIndex((item) => item.id === turn.id);
  if (existingIndex < 0) return [...turns, turn];
  const next = [...turns];
  next[existingIndex] = turn;
  return next;
}

function pendingTurn(turnId: string): Turn {
  return {
    id: turnId,
    items: [],
    itemsView: "full",
    status: "inProgress",
    error: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  };
}

function withFallbackStartedAt(turn: Turn, startedAt: number) {
  return turn.startedAt === null ? { ...turn, startedAt } : turn;
}

function ensureTurnStartedAt(turns: Turn[], turnId: string, startedAt: number) {
  if (!turns.some((turn) => turn.id === turnId)) {
    return [...turns, { ...pendingTurn(turnId), startedAt }];
  }
  return turns.map((turn) => turn.id === turnId
    ? withFallbackStartedAt(turn, startedAt)
    : turn);
}

function mergeSubmittedTurn(turns: Turn[], turn: Turn) {
  const existing = turns.find((item) => item.id === turn.id);
  if (!existing) return upsertTurn(turns, turn);
  const incomingIds = new Set(turn.items.map((item) => item.id));
  return upsertTurn(turns, {
    ...turn,
    startedAt: turn.startedAt ?? existing.startedAt,
    completedAt: turn.completedAt ?? existing.completedAt,
    durationMs: turn.durationMs ?? existing.durationMs,
    items: [...turn.items, ...existing.items.filter((item) => !incomingIds.has(item.id))],
  });
}

function mergeCompletedTurn(turns: Turn[], turn: Turn, completedAt: number) {
  const existing = turns.find((item) => item.id === turn.id);
  const completedTurn = {
    ...turn,
    startedAt: turn.startedAt ?? existing?.startedAt ?? null,
    completedAt: turn.completedAt ?? completedAt,
  };
  if (!existing) return upsertTurn(turns, completedTurn);
  const includesPersistedUser = completedTurn.items.some((item) => item.type === "userMessage");
  const existingItems = existing.items.filter((item) => {
    return !(includesPersistedUser && item.id.startsWith(LOCAL_USER_PREFIX));
  });
  if (completedTurn.itemsView === "full") {
    const optimisticUser = includesPersistedUser
      ? []
      : existingItems.filter((item) => item.type === "userMessage" && item.id.startsWith(LOCAL_USER_PREFIX));
    return upsertTurn(turns, { ...completedTurn, items: [...optimisticUser, ...completedTurn.items] });
  }
  const incomingById = new Map(completedTurn.items.map((item) => [item.id, item]));
  const mergedItems = existingItems.map((item) => incomingById.get(item.id) ?? item);
  const existingIds = new Set(existingItems.map((item) => item.id));
  mergedItems.push(...completedTurn.items.filter((item) => !existingIds.has(item.id)));
  return upsertTurn(turns, { ...completedTurn, items: mergedItems });
}

function optimisticUserItem(turnId: string, content: UserInput[]): ThreadItem {
  return {
    type: "userMessage",
    id: `${LOCAL_USER_PREFIX}${turnId}`,
    clientId: null,
    content,
  };
}

function withOptimisticUser(turn: Turn, content: UserInput[]): Turn {
  if (turn.items.some((item) => item.type === "userMessage")) return turn;
  return { ...turn, items: [optimisticUserItem(turn.id, content), ...turn.items] };
}

function upsertItem(turn: Turn, item: ThreadItem) {
  const withoutOptimisticUser = item.type === "userMessage"
    ? turn.items.filter((current) => !current.id.startsWith(LOCAL_USER_PREFIX))
    : turn.items;
  const existingIndex = withoutOptimisticUser.findIndex((current) => current.id === item.id);
  if (existingIndex < 0) return { ...turn, items: [...withoutOptimisticUser, item] };
  const items = [...withoutOptimisticUser];
  items[existingIndex] = item;
  return { ...turn, items };
}

function updateTurnItem(turns: Turn[], turnId: string, item: ThreadItem) {
  if (!turns.some((turn) => turn.id === turnId)) {
    return [...turns, upsertItem(pendingTurn(turnId), item)];
  }
  return turns.map((turn) => turn.id === turnId ? upsertItem(turn, item) : turn);
}

function updateExistingItem(
  turns: Turn[],
  turnId: string,
  itemId: string,
  update: (item: ThreadItem) => ThreadItem,
) {
  return turns.map((turn) => turn.id !== turnId ? turn : {
    ...turn,
    items: turn.items.map((item) => item.id === itemId ? update(item) : item),
  });
}

function appendIndexedText(values: string[], index: number, delta: string) {
  const next = [...values];
  while (next.length <= index) next.push("");
  next[index] += delta;
  return next;
}

function reconstructedDiffs(turns: Turn[]) {
  return Object.fromEntries(turns.flatMap((turn) => {
    const diff = turn.items
      .filter((item) => item.type === "fileChange")
      .flatMap((item) => item.changes.map((change) => change.diff.includes("diff --git ")
        ? change.diff
        : `diff --git a/${change.path} b/${change.path}\n--- a/${change.path}\n+++ b/${change.path}\n${change.diff}`))
      .filter(Boolean)
      .join("\n");
    return diff ? [[turn.id, diff]] : [];
  }));
}

function applyAgentDelta(turns: Turn[], notification: AgentMessageDeltaNotification) {
  if (!turns.some((turn) => turn.id === notification.turnId)) {
    return applyAgentDelta([...turns, pendingTurn(notification.turnId)], notification);
  }
  return turns.map((turn) => {
    if (turn.id !== notification.turnId) return turn;
    const existing = turn.items.find((item) => item.id === notification.itemId);
    const item: ThreadItem = existing?.type === "agentMessage"
      ? { ...existing, text: existing.text + notification.delta }
      : {
          type: "agentMessage",
          id: notification.itemId,
          text: notification.delta,
          phase: null,
          memoryCitation: null,
          delivery: null,
        };
    return upsertItem(turn, item);
  });
}

function applyPlanDelta(turns: Turn[], notification: PlanDeltaNotification) {
  if (!turns.some((turn) => turn.id === notification.turnId)) {
    return applyPlanDelta([...turns, pendingTurn(notification.turnId)], notification);
  }
  return turns.map((turn) => {
    if (turn.id !== notification.turnId) return turn;
    const existing = turn.items.find((item) => item.id === notification.itemId);
    const item: ThreadItem = existing?.type === "plan"
      ? { ...existing, text: existing.text + notification.delta }
      : { type: "plan", id: notification.itemId, text: notification.delta };
    return upsertItem(turn, item);
  });
}

export function agentSessionReducer(
  state: AgentSessionState,
  action: AgentSessionAction,
): AgentSessionState {
  switch (action.type) {
    case "clear":
      return initialAgentSessionState;
    case "clearLiveProgress":
      return { ...state, activeItemTurnIds: {}, mcpProgressByItemId: {} };
    case "loadThread": {
      const visibleTurns = boundedTurns(action.thread.turns);
      return {
        thread: { ...action.thread, turns: [] },
        turns: visibleTurns,
        diffsByTurnId: reconstructedDiffs(visibleTurns),
        plansByTurnId: {},
        activeItemTurnIds: {},
        mcpProgressByItemId: {},
        tokenUsage: null,
        threadSettings: null,
        threadGoal: null,
        processEventsByTurnId: {},
      };
    }
    case "updateThread":
      return state.thread?.id === action.thread.id
        ? { ...state, thread: { ...action.thread, turns: [] } }
        : state;
    case "threadSettingsUpdated":
      return state.thread?.id === action.notification.threadId
        ? { ...state, threadSettings: action.notification.threadSettings }
        : state;
    case "threadGoalUpdated":
      return state.thread?.id === action.notification.threadId
        ? { ...state, threadGoal: action.notification.goal }
        : state;
    case "threadGoalCleared":
      return state.thread?.id === action.threadId ? { ...state, threadGoal: null } : state;
    case "renameThread":
      return state.thread?.id === action.threadId
        ? { ...state, thread: { ...state.thread, name: action.name } }
        : state;
    case "threadStatusChanged":
      return state.thread?.id === action.threadId
        ? { ...state, thread: { ...state.thread, status: action.status } }
        : state;
    case "turnSubmitted":
      return withTurns(
        state,
        mergeSubmittedTurn(
          state.turns,
          withOptimisticUser(
            withFallbackStartedAt(
              action.turn,
              state.turns.find((turn) => turn.id === action.turn.id)?.startedAt
                ?? action.submittedAt,
            ),
            action.userInput,
          ),
        ),
      );
    case "turnStarted":
      return withTurns(
        state,
        mergeSubmittedTurn(
          state.turns,
          withFallbackStartedAt(
            action.turn,
            state.turns.find((turn) => turn.id === action.turn.id)?.startedAt
              ?? action.startedAt,
          ),
        ),
      );
    case "itemStarted":
      return withTurns(
        {
          ...state,
          activeItemTurnIds: {
            ...state.activeItemTurnIds,
            [action.notification.item.id]: action.notification.turnId,
          },
        },
        updateTurnItem(
          ensureTurnStartedAt(
            state.turns,
            action.notification.turnId,
            action.notification.startedAtMs / 1_000,
          ),
          action.notification.turnId,
          action.notification.item,
        ),
      );
    case "itemCompleted": {
      const activeItemTurnIds = { ...state.activeItemTurnIds };
      const mcpProgressByItemId = { ...state.mcpProgressByItemId };
      delete activeItemTurnIds[action.notification.item.id];
      delete mcpProgressByItemId[action.notification.item.id];
      return withTurns(
        { ...state, activeItemTurnIds, mcpProgressByItemId },
        updateTurnItem(state.turns, action.notification.turnId, action.notification.item),
      );
    }
    case "agentDelta":
      return withTurns(state, applyAgentDelta(state.turns, action.notification));
    case "planDelta":
      return withTurns(state, applyPlanDelta(state.turns, action.notification));
    case "commandDelta":
      return {
        ...state,
        turns: updateExistingItem(
          state.turns,
          action.notification.turnId,
          action.notification.itemId,
          (item) => item.type === "commandExecution"
            ? { ...item, aggregatedOutput: `${item.aggregatedOutput ?? ""}${action.notification.delta}` }
            : item,
        ),
      };
    case "mcpProgress":
      if (!state.turns.some((turn) => turn.id === action.notification.turnId)) return state;
      return {
        ...state,
        mcpProgressByItemId: {
          ...state.mcpProgressByItemId,
          [action.notification.itemId]: action.notification,
        },
      };
    case "reasoningSummaryDelta":
      return {
        ...state,
        turns: updateExistingItem(
          state.turns,
          action.notification.turnId,
          action.notification.itemId,
          (item) => item.type === "reasoning"
            ? {
                ...item,
                summary: appendIndexedText(
                  item.summary,
                  action.notification.summaryIndex,
                  action.notification.delta,
                ),
              }
            : item,
        ),
      };
    case "reasoningTextDelta":
      return {
        ...state,
        turns: updateExistingItem(
          state.turns,
          action.notification.turnId,
          action.notification.itemId,
          (item) => item.type === "reasoning"
            ? {
                ...item,
                content: appendIndexedText(
                  item.content,
                  action.notification.contentIndex,
                  action.notification.delta,
                ),
              }
            : item,
        ),
      };
    case "fileChangeUpdated":
      return {
        ...state,
        turns: updateExistingItem(
          state.turns,
          action.notification.turnId,
          action.notification.itemId,
          (item) => item.type === "fileChange"
            ? { ...item, changes: action.notification.changes }
            : item,
        ),
      };
    case "turnDiffUpdated":
      if (!state.turns.some((turn) => turn.id === action.notification.turnId)) return state;
      return {
        ...state,
        diffsByTurnId: {
          ...state.diffsByTurnId,
          [action.notification.turnId]: action.notification.diff,
        },
      };
    case "turnPlanUpdated":
      if (!state.turns.some((turn) => turn.id === action.notification.turnId)) return state;
      return {
        ...state,
        plansByTurnId: {
          ...state.plansByTurnId,
          [action.notification.turnId]: action.notification,
        },
      };
    case "tokenUsageUpdated":
      return { ...state, tokenUsage: action.notification.tokenUsage };
    case "autoApprovalReviewStarted": {
      const { notification } = action;
      if (state.thread?.id !== notification.threadId) return state;
      return {
        ...state,
        processEventsByTurnId: upsertReviewStarted(state.processEventsByTurnId, notification),
      };
    }
    case "autoApprovalReviewCompleted": {
      const { notification } = action;
      if (state.thread?.id !== notification.threadId) return state;
      return {
        ...state,
        processEventsByTurnId: updateReviewEvent(state.processEventsByTurnId, notification),
      };
    }
    case "terminalInteraction": {
      const { notification } = action;
      if (state.thread?.id !== notification.threadId) return state;
      return {
        ...state,
        processEventsByTurnId: appendProcessEvent(state.processEventsByTurnId, notification.turnId, {
          kind: "terminalInteraction",
          itemId: notification.itemId,
          processId: notification.processId,
          stdinLength: notification.stdin.length,
        }),
      };
    }
    case "turnCompleted": {
      const completedTurnId = action.notification.turn.id;
      return withTurns(
        {
          ...state,
          activeItemTurnIds: Object.fromEntries(
            Object.entries(state.activeItemTurnIds)
              .filter(([, turnId]) => turnId !== completedTurnId),
          ),
          mcpProgressByItemId: Object.fromEntries(
            Object.entries(state.mcpProgressByItemId)
              .filter(([, notification]) => notification.turnId !== completedTurnId),
          ),
        },
        mergeCompletedTurn(state.turns, action.notification.turn, action.completedAt),
      );
    }
  }
}

export function userMessageText(item: ThreadItem) {
  return userMessagePresentation(item).text;
}
