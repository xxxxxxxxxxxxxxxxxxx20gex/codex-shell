import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { GrantedPermissionProfile } from "../../generated/app-server/v2/GrantedPermissionProfile";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { ThreadNameUpdatedNotification } from "../../generated/app-server/v2/ThreadNameUpdatedNotification";
import type { ModelSettings } from "../models/types";
import { getPermissionMode, type PermissionMode } from "../approvals/permissionModes";
import { AppServerClient, type JsonValue } from "./appServerClient";
import { agentSessionReducer, initialAgentSessionState } from "./sessionState";
import { buildUserInput, type FileMention, type SkillMention } from "./sessionInput";
import { subscribeToSessionEvents, type PendingApprovalPayload } from "./sessionSubscriptions";
import { useAgentCommands } from "./useAgentCommands";
import { useRunningTurns } from "./useRunningTurns";
import { useWorkspaceFiles } from "./useWorkspaceFiles";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export type { FileMention, SkillMention } from "./sessionInput";

interface ApprovalIdentity {
  requestKey: string;
}

export type PendingApproval = ApprovalIdentity & PendingApprovalPayload;

type ApprovalScope = "turn" | "session";
type ApprovalResolver = (result: JsonValue) => void;

interface ApprovalEntry {
  approval: PendingApproval;
  resolve: ApprovalResolver;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function declineResult(approval: PendingApproval): JsonValue {
  return approval.kind === "permissions"
    ? { permissions: {}, scope: "turn" }
    : { decision: "decline" };
}

function updateThreadName(thread: Thread, notification: ThreadNameUpdatedNotification): Thread {
  return thread.id === notification.threadId
    ? { ...thread, name: notification.threadName ?? null }
    : thread;
}

export function useAgentSession(
  settings: ModelSettings,
  permissionMode: PermissionMode,
  workspacePath: string | null,
) {
  const clientRef = useRef<AppServerClient | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const threadOperationRef = useRef(false);
  const approvalSequenceRef = useRef(0);
  const approvalEntriesRef = useRef(new Map<string, ApprovalEntry>());
  const refreshHistoryRef = useRef<(append?: boolean) => Promise<void>>(async () => undefined);
  const initialHistoryLoadedRef = useRef(false);
  const [sessionState, dispatch] = useReducer(agentSessionReducer, initialAgentSessionState);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [codexHome, setCodexHome] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    runningThreadIds,
    markThreadRunning,
    markThreadStopped,
    clearRunningTurns,
    getRunningTurnId,
    isThreadRunning,
  } = useRunningTurns();
  const [history, setHistory] = useState<Thread[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);
  const [threadActionId, setThreadActionId] = useState<string | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<PendingApproval[]>([]);
  const [error, setError] = useState("");

  if (!clientRef.current) clientRef.current = new AppServerClient();

  const clearApprovals = useCallback(() => {
    for (const entry of approvalEntriesRef.current.values()) {
      entry.resolve(declineResult(entry.approval));
    }
    approvalEntriesRef.current.clear();
    setApprovalQueue([]);
  }, []);

  useEffect(() => {
    const client = clientRef.current;
    if (!client) return;
    return subscribeToSessionEvents(client, {
      currentThreadId: () => threadIdRef.current,
      dispatch,
      onTurnStarted: (notification) => {
        markThreadRunning(notification.threadId, notification.turn.id);
        if (notification.threadId === threadIdRef.current) {
          setSubmitting(false);
        }
      },
      onTurnCompleted: (notification) => {
        markThreadStopped(notification.threadId);
        if (notification.threadId === threadIdRef.current) {
          setSubmitting(false);
          dispatch({ type: "turnCompleted", notification });
          if (notification.turn.error) setError(notification.turn.error.message);
        }
        void refreshHistoryRef.current();
      },
      onError: (notification) => {
        if (notification.threadId === threadIdRef.current) setError(notification.error.message);
        if (!notification.willRetry) {
          markThreadStopped(notification.threadId);
          if (notification.threadId === threadIdRef.current) setSubmitting(false);
        }
      },
      onThreadName: (notification) => {
        setHistory((current) => current.map((thread) => updateThreadName(thread, notification)));
        dispatch({
          type: "renameThread",
          threadId: notification.threadId,
          name: notification.threadName ?? null,
        });
      },
      onStopped: () => {
        setConnectionStatus("disconnected");
        setCodexHome("");
        clearRunningTurns();
        setSubmitting(false);
        clearApprovals();
      },
      onProtocolError: (protocolError) => setError(protocolError.message),
      requestApproval: (pending) => new Promise<JsonValue>((resolve) => {
        const requestKey = `${pending.kind}:${pending.params.threadId}:${pending.params.turnId}:${pending.params.itemId}:${approvalSequenceRef.current++}`;
        const approval = { ...pending, requestKey } as PendingApproval;
        approvalEntriesRef.current.set(requestKey, { approval, resolve });
        setApprovalQueue((current) => [...current, approval]);
      }),
    });
  }, [clearApprovals, clearRunningTurns, markThreadRunning, markThreadStopped]);

  const resolveApproval = useCallback((approval: PendingApproval, result: JsonValue) => {
    const entry = approvalEntriesRef.current.get(approval.requestKey);
    if (!entry) return;
    approvalEntriesRef.current.delete(approval.requestKey);
    setApprovalQueue((current) => current.filter((item) => item.requestKey !== approval.requestKey));
    entry.resolve(result);
  }, []);

  const approve = useCallback((scope: ApprovalScope) => {
    const approval = approvalQueue[0];
    if (!approval) return;
    if (approval.kind === "command" || approval.kind === "fileChange") {
      resolveApproval(approval, { decision: scope === "session" ? "acceptForSession" : "accept" });
      return;
    }

    const granted: GrantedPermissionProfile = {};
    if (approval.params.permissions.network) granted.network = approval.params.permissions.network;
    if (approval.params.permissions.fileSystem) granted.fileSystem = approval.params.permissions.fileSystem;
    resolveApproval(approval, { permissions: granted as JsonValue, scope });
  }, [approvalQueue, resolveApproval]);

  const decline = useCallback(() => {
    const approval = approvalQueue[0];
    if (approval) resolveApproval(approval, declineResult(approval));
  }, [approvalQueue, resolveApproval]);

  const ensureConnected = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error("app-server 客户端尚未初始化");
    if (client.connectionStatus === "ready") {
      setConnectionStatus("connected");
      setCodexHome(client.serverInfo?.codexHome ?? "");
      return client;
    }

    setConnectionStatus("connecting");
    try {
      await client.start();
      setConnectionStatus("connected");
      setCodexHome(client.serverInfo?.codexHome ?? "");
      return client;
    } catch (startError) {
      setConnectionStatus("error");
      throw startError;
    }
  }, []);

  const refreshHistory = useCallback(async (append = false) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const client = await ensureConnected();
      const response = await client.listThreads({
        cursor: append ? historyNextCursor : null,
        limit: 30,
        sortKey: "recency_at",
        sortDirection: "desc",
      });
      const localThreads = response.data.filter((thread) => !thread.ephemeral);
      const active = localThreads.find((thread) => thread.id === threadIdRef.current);
      if (active) dispatch({ type: "updateThread", thread: active });
      setHistory((current) => {
        if (append) {
          const byId = new Map(current.map((thread) => [thread.id, thread]));
          localThreads.forEach((thread) => byId.set(thread.id, thread));
          return [...byId.values()];
        }
        const currentActive = current.find((thread) => thread.id === threadIdRef.current);
        return currentActive && !active ? [currentActive, ...localThreads] : localThreads;
      });
      setHistoryNextCursor(response.nextCursor);
    } catch (historyLoadError) {
      setHistoryError(errorMessage(historyLoadError));
    } finally {
      setHistoryLoading(false);
    }
  }, [ensureConnected, historyNextCursor]);
  refreshHistoryRef.current = refreshHistory;

  useEffect(() => {
    if (initialHistoryLoadedRef.current) return;
    initialHistoryLoadedRef.current = true;
    void refreshHistory();
  }, [refreshHistory]);

  const send = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
  ) => {
    const message = text.trim();
    const activeThreadId = threadIdRef.current;
    if (!message || submitting || threadOperationRef.current
      || (activeThreadId !== null && isThreadRunning(activeThreadId))) return false;

    threadOperationRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const client = await ensureConnected();
      let threadId = threadIdRef.current;
      if (!threadId) {
        const permissions = getPermissionMode(permissionMode);
        const response = await client.startThread({
          model: settings.modelId,
          cwd: workspacePath,
          approvalPolicy: permissions.approvalPolicy,
          approvalsReviewer: permissions.approvalsReviewer,
          sandbox: permissions.sandbox,
          ephemeral: false,
        });
        threadId = response.thread.id;
        threadIdRef.current = threadId;
        const optimisticThread = { ...response.thread, preview: response.thread.preview || message };
        dispatch({ type: "loadThread", thread: optimisticThread });
        setHistory((current) => [optimisticThread, ...current.filter((thread) => thread.id !== threadId)]);
      }

      const input = buildUserInput(message, mentions, skills);
      const response = await client.startTurn({
        threadId,
        input,
        model: settings.modelId,
        effort: settings.reasoningEffort,
      });
      markThreadRunning(threadId, response.turn.id);
      dispatch({ type: "turnSubmitted", turn: response.turn, userText: message });
      return true;
    } catch (sendError) {
      setError(errorMessage(sendError));
      return false;
    } finally {
      threadOperationRef.current = false;
      setSubmitting(false);
    }
  }, [ensureConnected, isThreadRunning, markThreadRunning, permissionMode, settings.modelId, settings.reasoningEffort, submitting, workspacePath]);

  const interrupt = useCallback(async () => {
    const threadId = threadIdRef.current;
    const turnId = threadId ? getRunningTurnId(threadId) : undefined;
    if (!threadId || !turnId || !clientRef.current) return;
    try {
      await clientRef.current.interruptTurn({ threadId, turnId });
    } catch (interruptError) {
      setError(errorMessage(interruptError));
    }
  }, [getRunningTurnId]);

  const openThread = useCallback(async (threadId: string) => {
    if (threadOperationRef.current || threadId === threadIdRef.current) return;
    threadOperationRef.current = true;
    setOpeningThreadId(threadId);
    setError("");
    try {
      const client = await ensureConnected();
      const permissions = getPermissionMode(permissionMode);
      const response = await client.resumeThread({
        threadId,
        model: settings.modelId,
        approvalPolicy: permissions.approvalPolicy,
        approvalsReviewer: permissions.approvalsReviewer,
        sandbox: permissions.sandbox,
      });
      threadIdRef.current = response.thread.id;
      const activeTurn = [...response.thread.turns].reverse().find((turn) => turn.status === "inProgress");
      if (activeTurn) markThreadRunning(response.thread.id, activeTurn.id);
      else markThreadStopped(response.thread.id);
      setSubmitting(false);
      dispatch({ type: "loadThread", thread: response.thread });
    } catch (resumeError) {
      setError(errorMessage(resumeError));
    } finally {
      threadOperationRef.current = false;
      setOpeningThreadId(null);
    }
  }, [ensureConnected, markThreadRunning, markThreadStopped, permissionMode, settings.modelId]);

  const startNewTask = useCallback(() => {
    if (threadOperationRef.current) return;
    threadIdRef.current = null;
    setSubmitting(false);
    setError("");
    dispatch({ type: "clear" });
  }, []);

  const renameThread = useCallback(async (threadId: string, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName || threadActionId) return false;
    setThreadActionId(threadId);
    setError("");
    try {
      const client = await ensureConnected();
      await client.setThreadName({ threadId, name: normalizedName });
      setHistory((current) => current.map((thread) => thread.id === threadId
        ? { ...thread, name: normalizedName }
        : thread));
      dispatch({ type: "renameThread", threadId, name: normalizedName });
      return true;
    } catch (renameError) {
      setError(errorMessage(renameError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [ensureConnected, threadActionId]);

  const toggleThreadPin = useCallback(async (thread: Thread) => {
    if (threadActionId) return false;
    setThreadActionId(thread.id);
    setError("");
    try {
      const client = await ensureConnected();
      const response = await client.updateThreadMetadata({
        threadId: thread.id,
        isPinned: !thread.isPinned,
      });
      setHistory((current) => current.map((item) => item.id === thread.id ? response.thread : item));
      dispatch({ type: "updateThread", thread: response.thread });
      return true;
    } catch (pinError) {
      setError(errorMessage(pinError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [ensureConnected, threadActionId]);

  const archiveThread = useCallback(async (threadId: string) => {
    if (threadActionId || isThreadRunning(threadId)) return false;
    setThreadActionId(threadId);
    setError("");
    try {
      const client = await ensureConnected();
      await client.archiveThread({ threadId });
      if (threadId === threadIdRef.current) startNewTask();
      await refreshHistoryRef.current();
      return true;
    } catch (archiveError) {
      setError(errorMessage(archiveError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [ensureConnected, isThreadRunning, startNewTask, threadActionId]);

  const deleteThread = useCallback(async (threadId: string) => {
    if (threadActionId || isThreadRunning(threadId)) return false;
    setThreadActionId(threadId);
    setError("");
    try {
      const client = await ensureConnected();
      await client.deleteThread({ threadId });
      if (threadId === threadIdRef.current) startNewTask();
      setHistory((current) => current.filter((thread) => thread.id !== threadId));
      return true;
    } catch (deleteError) {
      setError(errorMessage(deleteError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [ensureConnected, isThreadRunning, startNewTask, threadActionId]);

  const { searchFiles, readWorkspaceDirectory, readWorkspaceFile } = useWorkspaceFiles(
    ensureConnected,
    workspacePath,
  );
  const currentThreadId = useCallback(() => threadIdRef.current, []);
  const agentCommands = useAgentCommands(ensureConnected, currentThreadId, workspacePath);

  const restart = useCallback(async () => {
    threadOperationRef.current = true;
    setSubmitting(false);
    threadIdRef.current = null;
    clearRunningTurns();
    clearApprovals();
    dispatch({ type: "clear" });
    try {
      await clientRef.current?.stop();
      setConnectionStatus("disconnected");
      await refreshHistory();
    } catch (restartError) {
      setConnectionStatus("error");
      setError(errorMessage(restartError));
    } finally {
      threadOperationRef.current = false;
    }
  }, [clearApprovals, clearRunningTurns, refreshHistory]);

  const running = submitting || Boolean(
    sessionState.thread && runningThreadIds.has(sessionState.thread.id),
  );

  return {
    connectionStatus,
    codexHome,
    running,
    submitting,
    runningThreadIds,
    runningThreadCount: runningThreadIds.size,
    thread: sessionState.thread,
    turns: sessionState.turns,
    diffsByTurnId: sessionState.diffsByTurnId,
    plansByTurnId: sessionState.plansByTurnId,
    tokenUsage: sessionState.tokenUsage,
    history,
    historyLoading,
    historyError,
    historyHasMore: historyNextCursor !== null,
    openingThreadId,
    threadActionId,
    error,
    approval: approvalQueue[0] ?? null,
    approve,
    decline,
    send,
    interrupt,
    openThread,
    renameThread,
    toggleThreadPin,
    archiveThread,
    deleteThread,
    searchFiles,
    readWorkspaceDirectory,
    readWorkspaceFile,
    ...agentCommands,
    loadMoreHistory: () => refreshHistory(true),
    startNewTask,
    restart,
    refreshHistory,
  };
}
