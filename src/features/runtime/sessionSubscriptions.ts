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
import type { ItemGuardianApprovalReviewCompletedNotification } from "../../generated/app-server/v2/ItemGuardianApprovalReviewCompletedNotification";
import type { ItemGuardianApprovalReviewStartedNotification } from "../../generated/app-server/v2/ItemGuardianApprovalReviewStartedNotification";
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
import type { ThreadGoalUpdatedNotification } from "../../generated/app-server/v2/ThreadGoalUpdatedNotification";
import type { ThreadGoalClearedNotification } from "../../generated/app-server/v2/ThreadGoalClearedNotification";
import type { ThreadSettingsUpdatedNotification } from "../../generated/app-server/v2/ThreadSettingsUpdatedNotification";
import type { TerminalInteractionNotification } from "../../generated/app-server/v2/TerminalInteractionNotification";
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
  onThreadSettings: (notification: ThreadSettingsUpdatedNotification) => void;
  onThreadGoalUpdated: (notification: ThreadGoalUpdatedNotification) => void;
  onThreadGoalCleared: (notification: ThreadGoalClearedNotification) => void;
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
  /** Optional secondary stream used by the Codex-style side chat. */
  sideChat?: {
    currentThreadId: () => string | null;
    dispatch: (action: AgentSessionAction) => void;
    onTurnStarted: (notification: TurnStartedNotification) => void;
    onTurnCompleted: (notification: TurnCompletedNotification) => void;
    onError: (notification: ErrorNotification) => void;
  };
}

export function subscribeToSessionEvents(client: AppServerClient, handlers: Handlers) {
  function dispatchActive<T extends { threadId: string }>(
    params: unknown,
    mainAction: (notification: T) => AgentSessionAction,
  ) {
    const notification = params as T;
    if (notification.threadId === handlers.currentThreadId()) {
      handlers.dispatch(mainAction(notification));
    } else if (notification.threadId === handlers.sideChat?.currentThreadId()) {
      handlers.sideChat.dispatch(mainAction(notification));
    }
  }

  const disposers = [
    client.onNotification("item/agentMessage/delta", (params) => dispatchActive<AgentMessageDeltaNotification>(params, (notification) => ({ type: "agentDelta", notification }))),
    client.onNotification("item/plan/delta", (params) => dispatchActive<PlanDeltaNotification>(params, (notification) => ({ type: "planDelta", notification }))),
    client.onNotification("item/commandExecution/outputDelta", (params) => dispatchActive<CommandExecutionOutputDeltaNotification>(params, (notification) => ({ type: "commandDelta", notification }))),
    client.onNotification("item/mcpToolCall/progress", (params) => dispatchActive<McpToolCallProgressNotification>(params, (notification) => ({ type: "mcpProgress", notification }))),
    client.onNotification("item/reasoning/summaryTextDelta", (params) => dispatchActive<ReasoningSummaryTextDeltaNotification>(params, (notification) => ({ type: "reasoningSummaryDelta", notification }))),
    client.onNotification("item/reasoning/textDelta", (params) => dispatchActive<ReasoningTextDeltaNotification>(params, (notification) => ({ type: "reasoningTextDelta", notification }))),
    client.onNotification("item/fileChange/patchUpdated", (params) => dispatchActive<FileChangePatchUpdatedNotification>(params, (notification) => ({ type: "fileChangeUpdated", notification }))),
    client.onNotification("turn/diff/updated", (params) => dispatchActive<TurnDiffUpdatedNotification>(params, (notification) => ({ type: "turnDiffUpdated", notification }))),
    client.onNotification("turn/plan/updated", (params) => dispatchActive<TurnPlanUpdatedNotification>(params, (notification) => ({ type: "turnPlanUpdated", notification }))),
    client.onNotification("item/started", (params) => dispatchActive<ItemStartedNotification>(params, (notification) => ({ type: "itemStarted", notification }))),
    client.onNotification("item/completed", (params) => dispatchActive<ItemCompletedNotification>(params, (notification) => ({ type: "itemCompleted", notification }))),
    client.onNotification("turn/started", (params) => {
      const notification = params as TurnStartedNotification;
      handlers.onTurnStarted(notification);
      if (notification.threadId === handlers.sideChat?.currentThreadId()) handlers.sideChat.onTurnStarted(notification);
    }),
    client.onNotification("turn/completed", (params) => {
      const notification = params as TurnCompletedNotification;
      handlers.onTurnCompleted(notification);
      if (notification.threadId === handlers.sideChat?.currentThreadId()) handlers.sideChat.onTurnCompleted(notification);
    }),
    client.onNotification("error", (params) => {
      const notification = params as ErrorNotification;
      handlers.onError(notification);
      if (notification.threadId === handlers.sideChat?.currentThreadId()) handlers.sideChat.onError(notification);
    }),
    client.onNotification("thread/name/updated", (params) => handlers.onThreadName(params as ThreadNameUpdatedNotification)),
    client.onNotification("thread/settings/updated", (params) => handlers.onThreadSettings(params as ThreadSettingsUpdatedNotification)),
    client.onNotification("thread/goal/updated", (params) => handlers.onThreadGoalUpdated(params as ThreadGoalUpdatedNotification)),
    client.onNotification("thread/goal/cleared", (params) => handlers.onThreadGoalCleared(params as ThreadGoalClearedNotification)),
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
    client.onNotification("thread/tokenUsage/updated", (params) => dispatchActive<ThreadTokenUsageUpdatedNotification>(params, (notification) => ({ type: "tokenUsageUpdated", notification }))),
    client.onNotification("item/autoApprovalReview/started", (params) => dispatchActive<ItemGuardianApprovalReviewStartedNotification>(params, (notification) => ({ type: "autoApprovalReviewStarted", notification }))),
    client.onNotification("item/autoApprovalReview/completed", (params) => dispatchActive<ItemGuardianApprovalReviewCompletedNotification>(params, (notification) => ({ type: "autoApprovalReviewCompleted", notification }))),
    client.onNotification("item/commandExecution/terminalInteraction", (params) => dispatchActive<TerminalInteractionNotification>(params, (notification) => ({ type: "terminalInteraction", notification }))),
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
