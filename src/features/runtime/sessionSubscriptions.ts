import type { AgentMessageDeltaNotification } from "../../generated/app-server/v2/AgentMessageDeltaNotification";
import type { CommandExecutionOutputDeltaNotification } from "../../generated/app-server/v2/CommandExecutionOutputDeltaNotification";
import type { CommandExecutionRequestApprovalParams } from "../../generated/app-server/v2/CommandExecutionRequestApprovalParams";
import type { ErrorNotification } from "../../generated/app-server/v2/ErrorNotification";
import type { FileChangePatchUpdatedNotification } from "../../generated/app-server/v2/FileChangePatchUpdatedNotification";
import type { FileChangeRequestApprovalParams } from "../../generated/app-server/v2/FileChangeRequestApprovalParams";
import type { ItemCompletedNotification } from "../../generated/app-server/v2/ItemCompletedNotification";
import type { ItemStartedNotification } from "../../generated/app-server/v2/ItemStartedNotification";
import type { PermissionsRequestApprovalParams } from "../../generated/app-server/v2/PermissionsRequestApprovalParams";
import type { ReasoningSummaryTextDeltaNotification } from "../../generated/app-server/v2/ReasoningSummaryTextDeltaNotification";
import type { ReasoningTextDeltaNotification } from "../../generated/app-server/v2/ReasoningTextDeltaNotification";
import type { ThreadNameUpdatedNotification } from "../../generated/app-server/v2/ThreadNameUpdatedNotification";
import type { ThreadTokenUsageUpdatedNotification } from "../../generated/app-server/v2/ThreadTokenUsageUpdatedNotification";
import type { TurnCompletedNotification } from "../../generated/app-server/v2/TurnCompletedNotification";
import type { TurnDiffUpdatedNotification } from "../../generated/app-server/v2/TurnDiffUpdatedNotification";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import type { TurnStartedNotification } from "../../generated/app-server/v2/TurnStartedNotification";
import type { AppServerClient, JsonValue } from "./appServerClient";
import type { AgentSessionAction } from "./sessionState";

export type PendingApprovalPayload =
  | { kind: "command"; params: CommandExecutionRequestApprovalParams }
  | { kind: "fileChange"; params: FileChangeRequestApprovalParams }
  | { kind: "permissions"; params: PermissionsRequestApprovalParams };

interface Handlers {
  currentThreadId: () => string | null;
  dispatch: (action: AgentSessionAction) => void;
  onTurnStarted: (notification: TurnStartedNotification) => void;
  onTurnCompleted: (notification: TurnCompletedNotification) => void;
  onError: (notification: ErrorNotification) => void;
  onThreadName: (notification: ThreadNameUpdatedNotification) => void;
  onStopped: () => void;
  onProtocolError: (error: Error) => void;
  requestApproval: (pending: PendingApprovalPayload) => Promise<JsonValue>;
}

export function subscribeToSessionEvents(client: AppServerClient, handlers: Handlers) {
  function onActive<T extends { threadId: string }>(params: unknown, apply: (notification: T) => void) {
    const notification = params as T;
    if (notification.threadId === handlers.currentThreadId()) apply(notification);
  }

  const disposers = [
    client.onNotification("item/agentMessage/delta", (params) => onActive<AgentMessageDeltaNotification>(params, (notification) => handlers.dispatch({ type: "agentDelta", notification }))),
    client.onNotification("item/commandExecution/outputDelta", (params) => onActive<CommandExecutionOutputDeltaNotification>(params, (notification) => handlers.dispatch({ type: "commandDelta", notification }))),
    client.onNotification("item/reasoning/summaryTextDelta", (params) => onActive<ReasoningSummaryTextDeltaNotification>(params, (notification) => handlers.dispatch({ type: "reasoningSummaryDelta", notification }))),
    client.onNotification("item/reasoning/textDelta", (params) => onActive<ReasoningTextDeltaNotification>(params, (notification) => handlers.dispatch({ type: "reasoningTextDelta", notification }))),
    client.onNotification("item/fileChange/patchUpdated", (params) => onActive<FileChangePatchUpdatedNotification>(params, (notification) => handlers.dispatch({ type: "fileChangeUpdated", notification }))),
    client.onNotification("turn/diff/updated", (params) => onActive<TurnDiffUpdatedNotification>(params, (notification) => handlers.dispatch({ type: "turnDiffUpdated", notification }))),
    client.onNotification("turn/plan/updated", (params) => onActive<TurnPlanUpdatedNotification>(params, (notification) => handlers.dispatch({ type: "turnPlanUpdated", notification }))),
    client.onNotification("item/started", (params) => onActive<ItemStartedNotification>(params, (notification) => handlers.dispatch({ type: "itemStarted", notification }))),
    client.onNotification("item/completed", (params) => onActive<ItemCompletedNotification>(params, (notification) => handlers.dispatch({ type: "itemCompleted", notification }))),
    client.onNotification("turn/started", (params) => handlers.onTurnStarted(params as TurnStartedNotification)),
    client.onNotification("turn/completed", (params) => handlers.onTurnCompleted(params as TurnCompletedNotification)),
    client.onNotification("error", (params) => handlers.onError(params as ErrorNotification)),
    client.onNotification("thread/name/updated", (params) => handlers.onThreadName(params as ThreadNameUpdatedNotification)),
    client.onNotification("thread/tokenUsage/updated", (params) => onActive<ThreadTokenUsageUpdatedNotification>(params, (notification) => handlers.dispatch({ type: "tokenUsageUpdated", notification }))),
    client.onNotification("app-server/stopped", handlers.onStopped),
    client.onProtocolError(handlers.onProtocolError),
    client.onReverseRequest("item/commandExecution/requestApproval", (params) => handlers.requestApproval({ kind: "command", params: params as CommandExecutionRequestApprovalParams })),
    client.onReverseRequest("item/fileChange/requestApproval", (params) => handlers.requestApproval({ kind: "fileChange", params: params as FileChangeRequestApprovalParams })),
    client.onReverseRequest("item/permissions/requestApproval", (params) => handlers.requestApproval({ kind: "permissions", params: params as PermissionsRequestApprovalParams })),
  ];

  return () => disposers.forEach((dispose) => dispose());
}
