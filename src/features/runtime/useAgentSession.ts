import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ModeKind } from "../../generated/app-server/ModeKind";
import type { WindowsSandboxReadiness } from "../../generated/app-server/v2/WindowsSandboxReadiness";
import type { WindowsSandboxSetupMode } from "../../generated/app-server/v2/WindowsSandboxSetupMode";
import { errorMessage } from "../../shared/errors";
import type { ServerInteractionStore } from "../interactions/serverInteractionStore";
import { ServerInteractionStore as InteractionStore } from "../interactions/serverInteractionStore";
import type { ModelSettings, PersonalizationSettings } from "../models/types";
import type { ApprovalReviewerMode, PermissionMode } from "../approvals/permissionModes";
import { AppServerClient } from "./appServerClient";
import { RuntimeLogStore } from "./runtimeLogStore";
import { RuntimeNoticeStore } from "./runtimeNoticeStore";
import { agentSessionReducer, initialAgentSessionState } from "./sessionState";
import type { FileMention, ImageAttachment, SkillMention } from "./sessionInput";
import { subscribeToSessionEvents } from "./sessionSubscriptions";
import { useAgentCommands } from "./useAgentCommands";
import { canSteerRunningTurn, runningTurnLabel, useRunningTurns } from "./useRunningTurns";
import { useThreadController } from "./useThreadController";
import { useWorkspaceFiles } from "./useWorkspaceFiles";

export type { FileMention, ImageAttachment, SkillMention } from "./sessionInput";

export interface RetryingError {
  threadId: string;
  message: string;
}

export type RetryingErrorChange =
  | { type: "retrying"; threadId: string; message: string }
  | { type: "settled"; threadId: string }
  | { type: "clear" };

export function updateRetryingError(
  current: RetryingError | null,
  change: RetryingErrorChange,
): RetryingError | null {
  if (change.type === "clear") return null;
  if (change.type === "settled") return current?.threadId === change.threadId ? null : current;
  return { threadId: change.threadId, message: change.message };
}

export function visibleSessionError(
  persistentError: string,
  retryingError: RetryingError | null,
  activeThreadId: string | null,
) {
  return retryingError?.threadId === activeThreadId ? retryingError.message : persistentError;
}

function useStableStore<T>(create: () => T) {
  const storeRef = useRef<T | null>(null);
  storeRef.current ??= create();
  return storeRef.current;
}

export function useAgentSession(
  settings: ModelSettings,
  permissionMode: PermissionMode,
  approvalReviewer: ApprovalReviewerMode,
  projectCwd: string | null,
  personalization: PersonalizationSettings = { customInstructions: "", theme: "dark" },
) {
  const clientRef = useRef<AppServerClient | null>(null);
  clientRef.current ??= new AppServerClient();
  const [sessionState, dispatch] = useReducer(agentSessionReducer, initialAgentSessionState);
  const [codexHome, setCodexHome] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [retryingError, dispatchRetryingError] = useReducer(updateRetryingError, null);
  const [windowsSandboxReadiness, setWindowsSandboxReadiness] = useState<WindowsSandboxReadiness | null>(null);
  const runtimeLogStore = useStableStore(() => new RuntimeLogStore());
  const runtimeNoticeStore = useStableStore(() => new RuntimeNoticeStore());
  const interactionStore: ServerInteractionStore = useStableStore(() => new InteractionStore());
  const sandboxReadinessCheckedRef = useRef(false);
  const {
    runningTurns,
    markThreadRunning,
    markThreadStopped,
    markThreadStatus,
    clearRunningTurns,
    getRunningTurn,
    isThreadRunning,
  } = useRunningTurns();

  const readSandboxReadiness = useCallback(async (client: AppServerClient) => {
    if (sandboxReadinessCheckedRef.current) return;
    sandboxReadinessCheckedRef.current = true;
    try {
      const response = await client.readWindowsSandboxReadiness();
      setWindowsSandboxReadiness(response.status);
      if (response.status !== "ready") {
        runtimeNoticeStore.push({
          kind: "security",
          title: "Windows Sandbox 尚未就绪",
          message: response.status === "notConfigured"
            ? "app-server 检测到沙箱尚未配置，可在右侧状态页启动原生设置。"
            : "app-server 检测到沙箱需要更新，可在右侧状态页重新设置。",
        });
      }
    } catch {
      sandboxReadinessCheckedRef.current = false;
    }
  }, [runtimeNoticeStore]);

  const ensureConnected = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error("app-server 客户端尚未初始化");
    if (client.connectionStatus !== "ready") await client.start();
    setCodexHome(client.serverInfo?.codexHome ?? "");
    void readSandboxReadiness(client);
    return client;
  }, [readSandboxReadiness]);

  const threads = useThreadController({
    clientRef,
    ensureConnected,
    settings,
    personalization,
    permissionMode,
    approvalReviewer,
    projectCwd,
    dispatch,
    submitting,
    setSubmitting,
    setError,
    markThreadRunning,
    markThreadStopped,
    markThreadStatus,
    getRunningTurn,
    isThreadRunning,
  });
  const {
    currentThreadId,
    ensureActiveThread,
    onTurnStarted,
    onTurnCompleted,
    onThreadName,
    onThreadStarted,
    onThreadStatus,
    removeThread,
    onThreadUnarchived,
    onThreadClosed,
    openThread,
    reset: resetThreads,
    refreshHistory,
  } = threads;

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    return subscribeToSessionEvents(client, {
      currentThreadId,
      dispatch,
      onTurnStarted,
      onTurnCompleted: (notification) => {
        onTurnCompleted(notification);
        dispatchRetryingError({ type: "settled", threadId: notification.threadId });
      },
      onError: (notification) => {
        if (notification.threadId === currentThreadId()) {
          if (notification.willRetry) {
            dispatchRetryingError({
              type: "retrying",
              threadId: notification.threadId,
              message: notification.error.message,
            });
          } else {
            setError(notification.error.message);
          }
        }
        if (!notification.willRetry) {
          dispatchRetryingError({ type: "settled", threadId: notification.threadId });
          markThreadStopped(notification.threadId);
          if (notification.threadId === currentThreadId()) setSubmitting(false);
        }
      },
      onThreadName,
      onThreadStarted,
      onThreadStatus,
      onThreadArchived: (notification) => removeThread(notification.threadId),
      onThreadDeleted: (notification) => removeThread(notification.threadId),
      onThreadUnarchived: (notification) => onThreadUnarchived(notification.threadId),
      onThreadClosed: (notification) => onThreadClosed(notification.threadId),
      onServerRequestResolved: (notification) => interactionStore.dismiss(notification.requestId),
      onWarning: (notification) => runtimeNoticeStore.push({
        kind: "warning",
        title: "app-server 提示",
        message: notification.message,
      }),
      onGuardianWarning: (notification) => runtimeNoticeStore.push({
        kind: "security",
        title: "Guardian 安全提示",
        message: notification.message,
      }),
      onConfigWarning: (notification) => runtimeNoticeStore.push({
        kind: "warning",
        title: notification.summary,
        message: notification.details ?? "配置没有完全生效，请检查对应文件。",
        path: notification.path,
      }),
      onDeprecation: (notification) => runtimeNoticeStore.push({
        kind: "deprecation",
        title: notification.summary,
        message: notification.details ?? "当前能力将在未来版本中移除。",
      }),
      onWorldWritableWarning: (notification) => runtimeNoticeStore.push({
        kind: "security",
        title: "检测到世界可写目录",
        message: notification.failedScan
          ? "app-server 未能完成目录安全扫描。"
          : `${notification.samplePaths.join("、")}${notification.extraCount > 0 ? `，另有 ${notification.extraCount} 项` : ""}`,
      }),
      onSandboxSetupCompleted: (notification) => {
        setWindowsSandboxReadiness(notification.success ? "ready" : "notConfigured");
        runtimeNoticeStore.push({
          kind: notification.success ? "info" : "security",
          title: notification.success ? "Windows Sandbox 已就绪" : "Windows Sandbox 设置失败",
          message: notification.error ?? `已完成 ${notification.mode} 模式设置。`,
        });
      },
      onContextCompacted: (notification) => runtimeNoticeStore.push({
        kind: "info",
        title: "Session 上下文已压缩",
        message: `Thread ${notification.threadId} 已由 app-server 完成上下文压缩。`,
      }),
      onModelRerouted: (notification) => runtimeNoticeStore.push({
        kind: "warning",
        title: "模型已被重新路由",
        message: `${notification.fromModel} → ${notification.toModel}（${notification.reason}）`,
      }),
      onModelVerification: (notification) => runtimeNoticeStore.push({
        kind: "warning",
        title: "模型需要额外验证",
        message: `当前请求需要：${notification.verifications.join("、")}`,
      }),
      onModelSafetyBuffering: (notification) => {
        if (!notification.showBufferingUi) return;
        runtimeNoticeStore.push({
          kind: "warning",
          title: "模型响应正在安全缓冲",
          message: notification.fasterModel
            ? `可改用 ${notification.fasterModel} 以更快响应。`
            : "app-server 正在等待安全检查完成。",
        });
      },
      onMcpOauthLoginCompleted: (notification) => runtimeNoticeStore.push({
        kind: notification.success ? "info" : "warning",
        title: notification.success ? `MCP ${notification.name} 登录成功` : `MCP ${notification.name} 登录失败`,
        message: notification.error ?? (notification.success ? "app-server 已完成 OAuth 登录。" : "请重新发起 OAuth 登录。"),
      }),
      onMcpServerStatusUpdated: (notification) => runtimeNoticeStore.push({
        kind: notification.status === "failed" ? "warning" : "info",
        title: `MCP ${notification.name} · ${notification.status}`,
        message: notification.error ?? (notification.status === "ready" ? "服务器已就绪。" : "服务器启动状态已更新。"),
      }),
      onStopped: () => {
        dispatchRetryingError({ type: "clear" });
        setCodexHome("");
        setWindowsSandboxReadiness(null);
        sandboxReadinessCheckedRef.current = false;
        clearRunningTurns();
        interactionStore.clear();
        resetThreads();
      },
      onRuntimeLog: runtimeLogStore.enqueue,
      onProtocolError: (protocolError) => setError(protocolError.message),
      requestInteraction: interactionStore.request,
    });
  }, [
    clearRunningTurns,
    currentThreadId,
    interactionStore,
    markThreadStopped,
    onThreadClosed,
    onThreadName,
    onThreadStarted,
    onThreadStatus,
    onThreadUnarchived,
    onTurnCompleted,
    onTurnStarted,
    removeThread,
    resetThreads,
    runtimeLogStore,
    runtimeNoticeStore,
  ]);

  useEffect(() => () => {
    runtimeLogStore.dispose();
    runtimeNoticeStore.dispose();
    interactionStore.dispose();
  }, [interactionStore, runtimeLogStore, runtimeNoticeStore]);

  const activeProjectCwd = sessionState.thread?.cwd
    ? String(sessionState.thread.cwd)
    : projectCwd;
  const { searchFiles, readWorkspaceDirectory, readWorkspaceFile, watchWorkspacePath } = useWorkspaceFiles(
    ensureConnected,
    activeProjectCwd,
  );
  const agentCommands = useAgentCommands(
    ensureConnected,
    ensureActiveThread,
    currentThreadId,
    activeProjectCwd,
    markThreadRunning,
    markThreadStopped,
  );

  const setupWindowsSandbox = useCallback(async (mode: WindowsSandboxSetupMode) => {
    try {
      const client = await ensureConnected();
      await client.startWindowsSandboxSetup({ mode, cwd: activeProjectCwd });
      runtimeNoticeStore.push({
        kind: "info",
        title: "Windows Sandbox 设置已开始",
        message: "app-server 会在设置完成后发送结果。",
      });
      return true;
    } catch (setupError) {
      setError(errorMessage(setupError));
      return false;
    }
  }, [activeProjectCwd, ensureConnected, runtimeNoticeStore]);

  const restart = useCallback(async () => {
    const threadIdToRestore = currentThreadId();
    dispatchRetryingError({ type: "clear" });
    setSubmitting(false);
    clearRunningTurns();
    interactionStore.clear();
    sandboxReadinessCheckedRef.current = false;
    setWindowsSandboxReadiness(null);
    try {
      await clientRef.current?.stop();
      await refreshHistory();
      if (threadIdToRestore) await openThread(threadIdToRestore);
    } catch (restartError) {
      setError(errorMessage(restartError));
    }
  }, [clearRunningTurns, currentThreadId, interactionStore, openThread, refreshHistory]);

  const currentRunningTurn = sessionState.thread
    ? runningTurns.get(sessionState.thread.id)
    : undefined;
  const running = submitting || Boolean(currentRunningTurn);
  const canSteer = canSteerRunningTurn(currentRunningTurn);
  const canInterrupt = Boolean(currentRunningTurn?.turnId);
  const activityLabel = submitting && !currentRunningTurn
    ? "正在提交"
    : runningTurnLabel(currentRunningTurn);
  const runningThreadIds = new Set(runningTurns.keys());

  return {
    codexHome,
    running,
    canSteer,
    canInterrupt,
    activityLabel,
    submitting,
    runningThreadIds,
    runningThreadCount: runningThreadIds.size,
    thread: sessionState.thread,
    turns: sessionState.turns,
    diffsByTurnId: sessionState.diffsByTurnId,
    plansByTurnId: sessionState.plansByTurnId,
    activeItemTurnIds: sessionState.activeItemTurnIds,
    mcpProgressByItemId: sessionState.mcpProgressByItemId,
    tokenUsage: sessionState.tokenUsage,
    error: visibleSessionError(error, retryingError, sessionState.thread?.id ?? null),
    runtimeLogStore,
    runtimeNoticeStore,
    interactionStore,
    windowsSandboxReadiness,
    setupWindowsSandbox,
    searchFiles,
    readWorkspaceDirectory,
    readWorkspaceFile,
    watchWorkspacePath,
    ...threads,
    ...agentCommands,
    restart,
  };
}

export type AgentSession = ReturnType<typeof useAgentSession>;

export async function sendOrQueue(
  session: Pick<AgentSession, "running" | "send" | "queue">,
  text: string,
  mentions: FileMention[],
  skills: SkillMention[],
  collaborationMode: ModeKind,
  images: ImageAttachment[] = [],
) {
  if (images.length === 0) {
    return session.running
      ? session.queue(text, mentions, skills, collaborationMode)
      : session.send(text, mentions, skills, collaborationMode);
  }
  return session.running
    ? session.queue(text, mentions, skills, collaborationMode, images)
    : session.send(text, mentions, skills, collaborationMode, images);
}
