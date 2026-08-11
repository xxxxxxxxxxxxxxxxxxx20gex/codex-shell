import type { AgentMessageDeltaNotification } from "../../generated/app-server/v2/AgentMessageDeltaNotification";
import type { CommandExecutionOutputDeltaNotification } from "../../generated/app-server/v2/CommandExecutionOutputDeltaNotification";
import type { CommandExecutionRequestApprovalParams } from "../../generated/app-server/v2/CommandExecutionRequestApprovalParams";
import type { ConfigWarningNotification } from "../../generated/app-server/v2/ConfigWarningNotification";
import type { ContextCompactedNotification } from "../../generated/app-server/v2/ContextCompactedNotification";
import type { DeprecationNoticeNotification } from "../../generated/app-server/v2/DeprecationNoticeNotification";
import type { ErrorNotification } from "../../generated/app-server/v2/ErrorNotification";
import type { FileChangePatchUpdatedNotification } from "../../generated/app-server/v2/FileChangePatchUpdatedNotification";
import type { FileChangeRequestApprovalParams } from "../../generated/app-server/v2/FileChangeRequestApprovalParams";
import type { GuardianWarningNotification } from "../../generated/app-server/v2/GuardianWarningNotification";
import type { ItemCompletedNotification } from "../../generated/app-server/v2/ItemCompletedNotification";
import type { ItemStartedNotification } from "../../generated/app-server/v2/ItemStartedNotification";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { McpServerElicitationRequestParams } from "../../generated/app-server/v2/McpServerElicitationRequestParams";
import type { McpServerOauthLoginCompletedNotification } from "../../generated/app-server/v2/McpServerOauthLoginCompletedNotification";
import type { McpServerStatusUpdatedNotification } from "../../generated/app-server/v2/McpServerStatusUpdatedNotification";
import type { ModelReroutedNotification } from "../../generated/app-server/v2/ModelReroutedNotification";
import type { ModelSafetyBufferingUpdatedNotification } from "../../generated/app-server/v2/ModelSafetyBufferingUpdatedNotification";
import type { ModelVerificationNotification } from "../../generated/app-server/v2/ModelVerificationNotification";
import type { PermissionsRequestApprovalParams } from "../../generated/app-server/v2/PermissionsRequestApprovalParams";
import type { PlanDeltaNotification } from "../../generated/app-server/v2/PlanDeltaNotification";
import type { ReasoningSummaryTextDeltaNotification } from "../../generated/app-server/v2/ReasoningSummaryTextDeltaNotification";
import type { ReasoningTextDeltaNotification } from "../../generated/app-server/v2/ReasoningTextDeltaNotification";
import type { ThreadNameUpdatedNotification } from "../../generated/app-server/v2/ThreadNameUpdatedNotification";
import type { ServerRequestResolvedNotification } from "../../generated/app-server/v2/ServerRequestResolvedNotification";
import type { ThreadArchivedNotification } from "../../generated/app-server/v2/ThreadArchivedNotification";
import type { ThreadClosedNotification } from "../../generated/app-server/v2/ThreadClosedNotification";
import type { ThreadDeletedNotification } from "../../generated/app-server/v2/ThreadDeletedNotification";
import type { ThreadStartedNotification } from "../../generated/app-server/v2/ThreadStartedNotification";
import type { ThreadStatusChangedNotification } from "../../generated/app-server/v2/ThreadStatusChangedNotification";
import type { ThreadTokenUsageUpdatedNotification } from "../../generated/app-server/v2/ThreadTokenUsageUpdatedNotification";
import type { ThreadUnarchivedNotification } from "../../generated/app-server/v2/ThreadUnarchivedNotification";
import type { ToolRequestUserInputParams } from "../../generated/app-server/v2/ToolRequestUserInputParams";
import type { TurnCompletedNotification } from "../../generated/app-server/v2/TurnCompletedNotification";
import type { TurnDiffUpdatedNotification } from "../../generated/app-server/v2/TurnDiffUpdatedNotification";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import type { TurnStartedNotification } from "../../generated/app-server/v2/TurnStartedNotification";
import type { WarningNotification } from "../../generated/app-server/v2/WarningNotification";
import type { WindowsSandboxSetupCompletedNotification } from "../../generated/app-server/v2/WindowsSandboxSetupCompletedNotification";
import type { WindowsWorldWritableWarningNotification } from "../../generated/app-server/v2/WindowsWorldWritableWarningNotification";
import type { ServerInteractionPayload } from "../interactions/serverInteractionStore";
import type { AppServerClient, JsonRpcId, ReverseRequestResult } from "./appServerClient";
import type { AgentSessionAction } from "./sessionState";

interface Handlers {
  currentThreadId: () => string | null;
  dispatch: (action: AgentSessionAction) => void;
  onTurnStarted: (notification: TurnStartedNotification) => void;
  onTurnCompleted: (notification: TurnCompletedNotification) => void;
  onError: (notification: ErrorNotification) => void;
  onThreadName: (notification: ThreadNameUpdatedNotification) => void;
  onThreadStarted: (notification: ThreadStartedNotification) => void;
  onThreadStatus: (notification: ThreadStatusChangedNotification) => void;
  onThreadArchived: (notification: ThreadArchivedNotification) => void;
  onThreadDeleted: (notification: ThreadDeletedNotification) => void;
  onThreadUnarchived: (notification: ThreadUnarchivedNotification) => void;
  onThreadClosed: (notification: ThreadClosedNotification) => void;
  onServerRequestResolved: (notification: ServerRequestResolvedNotification) => void;
  onWarning: (notification: WarningNotification) => void;
  onGuardianWarning: (notification: GuardianWarningNotification) => void;
  onConfigWarning: (notification: ConfigWarningNotification) => void;
  onDeprecation: (notification: DeprecationNoticeNotification) => void;
  onWorldWritableWarning: (notification: WindowsWorldWritableWarningNotification) => void;
  onSandboxSetupCompleted: (notification: WindowsSandboxSetupCompletedNotification) => void;
  onContextCompacted: (notification: ContextCompactedNotification) => void;
  onModelRerouted: (notification: ModelReroutedNotification) => void;
  onModelVerification: (notification: ModelVerificationNotification) => void;
  onModelSafetyBuffering: (notification: ModelSafetyBufferingUpdatedNotification) => void;
  onMcpOauthLoginCompleted: (notification: McpServerOauthLoginCompletedNotification) => void;
  onMcpServerStatusUpdated: (notification: McpServerStatusUpdatedNotification) => void;
  onStopped: () => void;
  onRuntimeLog: (line: string) => void;
  onProtocolError: (error: Error) => void;
  requestInteraction: (
    requestId: JsonRpcId,
    interaction: ServerInteractionPayload,
  ) => Promise<ReverseRequestResult>;
}

export function subscribeToSessionEvents(client: AppServerClient, handlers: Handlers) {
  function onActive<T extends { threadId: string }>(params: unknown, apply: (notification: T) => void) {
    const notification = params as T;
    if (notification.threadId === handlers.currentThreadId()) apply(notification);
  }

  const disposers = [
    client.onNotification("item/agentMessage/delta", (params) => onActive<AgentMessageDeltaNotification>(params, (notification) => handlers.dispatch({ type: "agentDelta", notification }))),
    client.onNotification("item/plan/delta", (params) => onActive<PlanDeltaNotification>(params, (notification) => handlers.dispatch({ type: "planDelta", notification }))),
    client.onNotification("item/commandExecution/outputDelta", (params) => onActive<CommandExecutionOutputDeltaNotification>(params, (notification) => handlers.dispatch({ type: "commandDelta", notification }))),
    client.onNotification("item/mcpToolCall/progress", (params) => onActive<McpToolCallProgressNotification>(params, (notification) => handlers.dispatch({ type: "mcpProgress", notification }))),
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
    client.onNotification("thread/started", (params) => handlers.onThreadStarted(params as ThreadStartedNotification)),
    client.onNotification("thread/status/changed", (params) => handlers.onThreadStatus(params as ThreadStatusChangedNotification)),
    client.onNotification("thread/archived", (params) => handlers.onThreadArchived(params as ThreadArchivedNotification)),
    client.onNotification("thread/deleted", (params) => handlers.onThreadDeleted(params as ThreadDeletedNotification)),
    client.onNotification("thread/unarchived", (params) => handlers.onThreadUnarchived(params as ThreadUnarchivedNotification)),
    client.onNotification("thread/closed", (params) => handlers.onThreadClosed(params as ThreadClosedNotification)),
    client.onNotification("serverRequest/resolved", (params) => handlers.onServerRequestResolved(params as ServerRequestResolvedNotification)),
    client.onNotification("warning", (params) => handlers.onWarning(params as WarningNotification)),
    client.onNotification("guardianWarning", (params) => handlers.onGuardianWarning(params as GuardianWarningNotification)),
    client.onNotification("configWarning", (params) => handlers.onConfigWarning(params as ConfigWarningNotification)),
    client.onNotification("deprecationNotice", (params) => handlers.onDeprecation(params as DeprecationNoticeNotification)),
    client.onNotification("windows/worldWritableWarning", (params) => handlers.onWorldWritableWarning(params as WindowsWorldWritableWarningNotification)),
    client.onNotification("windowsSandbox/setupCompleted", (params) => handlers.onSandboxSetupCompleted(params as WindowsSandboxSetupCompletedNotification)),
    client.onNotification("thread/compacted", (params) => handlers.onContextCompacted(params as ContextCompactedNotification)),
    client.onNotification("model/rerouted", (params) => handlers.onModelRerouted(params as ModelReroutedNotification)),
    client.onNotification("model/verification", (params) => handlers.onModelVerification(params as ModelVerificationNotification)),
    client.onNotification("model/safetyBuffering/updated", (params) => handlers.onModelSafetyBuffering(params as ModelSafetyBufferingUpdatedNotification)),
    client.onNotification("mcpServer/oauthLogin/completed", (params) => handlers.onMcpOauthLoginCompleted(params as McpServerOauthLoginCompletedNotification)),
    client.onNotification("mcpServer/startupStatus/updated", (params) => handlers.onMcpServerStatusUpdated(params as McpServerStatusUpdatedNotification)),
    client.onNotification("thread/tokenUsage/updated", (params) => onActive<ThreadTokenUsageUpdatedNotification>(params, (notification) => handlers.dispatch({ type: "tokenUsageUpdated", notification }))),
    client.onNotification("app-server/stopped", handlers.onStopped),
    client.onLog(handlers.onRuntimeLog),
    client.onProtocolError(handlers.onProtocolError),
    client.onReverseRequest("item/commandExecution/requestApproval", (params, requestId) => handlers.requestInteraction(requestId, { kind: "commandApproval", params: params as CommandExecutionRequestApprovalParams })),
    client.onReverseRequest("item/fileChange/requestApproval", (params, requestId) => handlers.requestInteraction(requestId, { kind: "fileChangeApproval", params: params as FileChangeRequestApprovalParams })),
    client.onReverseRequest("item/permissions/requestApproval", (params, requestId) => handlers.requestInteraction(requestId, { kind: "permissionsApproval", params: params as PermissionsRequestApprovalParams })),
    client.onReverseRequest("item/tool/requestUserInput", (params, requestId) => handlers.requestInteraction(requestId, { kind: "userInput", params: params as ToolRequestUserInputParams })),
    client.onReverseRequest("mcpServer/elicitation/request", (params, requestId) => handlers.requestInteraction(requestId, { kind: "mcpElicitation", params: params as McpServerElicitationRequestParams })),
  ];

  return () => disposers.forEach((dispose) => dispose());
}
