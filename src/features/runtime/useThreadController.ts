import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { ModeKind } from "../../generated/app-server/ModeKind";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { ThreadNameUpdatedNotification } from "../../generated/app-server/v2/ThreadNameUpdatedNotification";
import type { ThreadStartedNotification } from "../../generated/app-server/v2/ThreadStartedNotification";
import type { ThreadStatusChangedNotification } from "../../generated/app-server/v2/ThreadStatusChangedNotification";
import type { TurnCompletedNotification } from "../../generated/app-server/v2/TurnCompletedNotification";
import type { TurnStartedNotification } from "../../generated/app-server/v2/TurnStartedNotification";
import { errorMessage } from "../../shared/errors";
import { assertModelVisibleInput } from "../../shared/modelVisibleInput";
import { getPermissionMode, type PermissionMode } from "../approvals/permissionModes";
import type { ModelSettings } from "../models/types";
import type { AppServerClient } from "./appServerClient";
import { buildUserInput, type FileMention, type SkillMention } from "./sessionInput";
import type { AgentSessionAction } from "./sessionState";
import { useThreadHistory } from "./useThreadHistory";
import { useThreadReview } from "./useThreadReview";

type EnsureConnected = () => Promise<AppServerClient>;

interface Props {
  clientRef: MutableRefObject<AppServerClient | null>;
  ensureConnected: EnsureConnected;
  settings: ModelSettings;
  permissionMode: PermissionMode;
  workspacePath: string | null;
  dispatch: Dispatch<AgentSessionAction>;
  submitting: boolean;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  markThreadRunning: (threadId: string, turnId: string) => void;
  markThreadStopped: (threadId: string) => void;
  markThreadStatus: (threadId: string, status: Thread["status"]) => void;
  getRunningTurnId: (threadId: string) => string | undefined;
  isThreadRunning: (threadId: string) => boolean;
}

function activeTurn(thread: Thread) {
  return [...thread.turns].reverse().find((turn) => turn.status === "inProgress");
}

function canResumeAfterReadError(error: unknown) {
  const message = errorMessage(error);
  return message.includes("paginated threads do not support thread/read(includeTurns=true)")
    || message.includes("includeTurns is unavailable before first user message")
    || message.includes("ephemeral threads do not support includeTurns");
}

export function useThreadController(props: Props) {
  const threadIdRef = useRef<string | null>(null);
  const threadOperationRef = useRef(false);
  const subscribedThreadIdsRef = useRef(new Set<string>());
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);
  const [threadActionId, setThreadActionId] = useState<string | null>(null);

  const currentThreadId = useCallback(() => threadIdRef.current, []);
  const threadHistory = useThreadHistory({
    ensureConnected: props.ensureConnected,
    dispatch: props.dispatch,
    currentThreadId,
  });
  const {
    archived: historyArchived,
    error: historyError,
    hasMore: historyHasMore,
    loadMore: loadMoreHistory,
    loading: historyLoading,
    refresh: refreshHistory,
    remove: removeFromHistory,
    rename: renameInHistory,
    replace: replaceInHistory,
    showActiveWith,
    showArchived: showArchivedHistory,
    threads: history,
    updateStatus: updateHistoryStatus,
    upsert: upsertHistory,
  } = threadHistory;

  const applyThreadRuntimeState = useCallback((thread: Thread) => {
    const runningTurn = activeTurn(thread);
    if (runningTurn) props.markThreadRunning(thread.id, runningTurn.id);
    else props.markThreadStatus(thread.id, thread.status);
  }, [props.markThreadRunning, props.markThreadStatus]);

  const unsubscribeIfIdle = useCallback(async (threadId: string | null) => {
    if (!threadId || props.isThreadRunning(threadId) || !subscribedThreadIdsRef.current.has(threadId)) {
      return;
    }
    subscribedThreadIdsRef.current.delete(threadId);
    try {
      const client = await props.ensureConnected();
      await client.unsubscribeThread({ threadId });
    } catch (unsubscribeError) {
      subscribedThreadIdsRef.current.add(threadId);
      props.setError(errorMessage(unsubscribeError));
    }
  }, [props.ensureConnected, props.isThreadRunning, props.setError]);

  const ensureActiveThread = useCallback(async () => {
    const threadId = threadIdRef.current;
    if (!threadId) throw new Error("请先发送一条消息创建 Session");
    const client = await props.ensureConnected();
    if (!subscribedThreadIdsRef.current.has(threadId)) {
      const permissions = getPermissionMode(props.permissionMode);
      const response = await client.resumeThread({
        threadId,
        model: props.settings.modelId,
        approvalPolicy: permissions.approvalPolicy,
        approvalsReviewer: permissions.approvalsReviewer,
        sandbox: permissions.sandbox,
      });
      subscribedThreadIdsRef.current.add(threadId);
      props.dispatch({ type: "loadThread", thread: response.thread });
      applyThreadRuntimeState(response.thread);
    }
    return { client, threadId };
  }, [applyThreadRuntimeState, props.dispatch, props.ensureConnected, props.permissionMode, props.settings.modelId]);

  const send = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
    collaborationMode: ModeKind = "default",
  ) => {
    const message = text.trim();
    const activeThreadId = threadIdRef.current;
    if (!message || props.submitting || threadOperationRef.current
      || (activeThreadId !== null && props.isThreadRunning(activeThreadId))) return false;

    threadOperationRef.current = true;
    props.setSubmitting(true);
    props.setError("");
    try {
      assertModelVisibleInput(message, "消息");
      const client = await props.ensureConnected();
      let threadId = threadIdRef.current;
      if (!threadId) {
        const permissions = getPermissionMode(props.permissionMode);
        const response = await client.startThread({
          model: props.settings.modelId,
          cwd: props.workspacePath,
          approvalPolicy: permissions.approvalPolicy,
          approvalsReviewer: permissions.approvalsReviewer,
          sandbox: permissions.sandbox,
          ephemeral: false,
        });
        threadId = response.thread.id;
        threadIdRef.current = threadId;
        subscribedThreadIdsRef.current.add(threadId);
        const optimisticThread = { ...response.thread, preview: response.thread.preview || message };
        props.dispatch({ type: "loadThread", thread: optimisticThread });
        showActiveWith(optimisticThread);
      } else if (!subscribedThreadIdsRef.current.has(threadId)) {
        await ensureActiveThread();
      }

      const input = buildUserInput(message, mentions, skills);
      const permissions = getPermissionMode(props.permissionMode);
      const collaboration = collaborationMode === "plan" ? {
        mode: collaborationMode,
        settings: {
          model: props.settings.modelId,
          reasoning_effort: props.settings.reasoningEffort,
          developer_instructions: null,
        },
      } : undefined;
      const response = await client.startTurn({
        threadId,
        input,
        model: props.settings.modelId,
        effort: props.settings.reasoningEffort,
        approvalPolicy: permissions.approvalPolicy,
        approvalsReviewer: permissions.approvalsReviewer,
        ...(permissions.sandbox === "danger-full-access" ? { sandboxPolicy: { type: "dangerFullAccess" as const } } : {}),
      }, collaboration);
      props.markThreadRunning(threadId, response.turn.id);
      props.dispatch({ type: "turnSubmitted", turn: response.turn, userText: message });
      return true;
    } catch (sendError) {
      props.setError(errorMessage(sendError));
      return false;
    } finally {
      threadOperationRef.current = false;
      props.setSubmitting(false);
    }
  }, [
    ensureActiveThread,
    props.dispatch,
    props.ensureConnected,
    props.isThreadRunning,
    props.markThreadRunning,
    props.permissionMode,
    props.setError,
    props.setSubmitting,
    props.settings.modelId,
    props.settings.reasoningEffort,
    props.submitting,
    showActiveWith,
    props.workspacePath,
  ]);

  const steer = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
  ) => {
    const message = text.trim();
    const threadId = threadIdRef.current;
    const expectedTurnId = threadId ? props.getRunningTurnId(threadId) : undefined;
    if (!message || !threadId || !expectedTurnId || threadOperationRef.current) return false;
    threadOperationRef.current = true;
    props.setError("");
    try {
      assertModelVisibleInput(message, "补充指令");
      const { client } = await ensureActiveThread();
      await client.steerTurn({
        threadId,
        expectedTurnId,
        input: buildUserInput(message, mentions, skills),
      });
      return true;
    } catch (steerError) {
      props.setError(errorMessage(steerError));
      return false;
    } finally {
      threadOperationRef.current = false;
    }
  }, [ensureActiveThread, props.getRunningTurnId, props.setError]);

  const interrupt = useCallback(async () => {
    const threadId = threadIdRef.current;
    const turnId = threadId ? props.getRunningTurnId(threadId) : undefined;
    if (!threadId || !turnId || !props.clientRef.current) return;
    try {
      await props.clientRef.current.interruptTurn({ threadId, turnId });
    } catch (interruptError) {
      props.setError(errorMessage(interruptError));
    }
  }, [props.clientRef, props.getRunningTurnId, props.setError]);

  const openThread = useCallback(async (threadId: string) => {
    if (threadOperationRef.current || threadId === threadIdRef.current) return;
    threadOperationRef.current = true;
    setOpeningThreadId(threadId);
    props.setError("");
    const previousThreadId = threadIdRef.current;
    try {
      await unsubscribeIfIdle(previousThreadId);
      const client = await props.ensureConnected();
      let openedThread: Thread;
      try {
        openedThread = (await client.readThread({ threadId, includeTurns: true })).thread;
      } catch (readError) {
        if (!canResumeAfterReadError(readError)) throw readError;
        const permissions = getPermissionMode(props.permissionMode);
        openedThread = (await client.resumeThread({
          threadId,
          model: props.settings.modelId,
          approvalPolicy: permissions.approvalPolicy,
          approvalsReviewer: permissions.approvalsReviewer,
          sandbox: permissions.sandbox,
        })).thread;
        subscribedThreadIdsRef.current.add(threadId);
      }
      threadIdRef.current = openedThread.id;
      applyThreadRuntimeState(openedThread);
      props.setSubmitting(false);
      props.dispatch({ type: "loadThread", thread: openedThread });
    } catch (readError) {
      props.setError(errorMessage(readError));
    } finally {
      threadOperationRef.current = false;
      setOpeningThreadId(null);
    }
  }, [
    applyThreadRuntimeState,
    props.dispatch,
    props.ensureConnected,
    props.permissionMode,
    props.setError,
    props.setSubmitting,
    props.settings.modelId,
    unsubscribeIfIdle,
  ]);

  const startNewTask = useCallback(() => {
    if (threadOperationRef.current) return;
    const previousThreadId = threadIdRef.current;
    threadIdRef.current = null;
    props.setSubmitting(false);
    props.setError("");
    props.dispatch({ type: "clear" });
    showArchivedHistory(false);
    void unsubscribeIfIdle(previousThreadId);
  }, [props.dispatch, props.setError, props.setSubmitting, showArchivedHistory, unsubscribeIfIdle]);

  const renameThread = useCallback(async (threadId: string, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName || threadActionId) return false;
    setThreadActionId(threadId);
    props.setError("");
    try {
      const client = await props.ensureConnected();
      await client.setThreadName({ threadId, name: normalizedName });
      renameInHistory(threadId, normalizedName);
      props.dispatch({ type: "renameThread", threadId, name: normalizedName });
      return true;
    } catch (renameError) {
      props.setError(errorMessage(renameError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [props.dispatch, props.ensureConnected, props.setError, renameInHistory, threadActionId]);

  const toggleThreadPin = useCallback(async (thread: Thread) => {
    if (threadActionId) return false;
    setThreadActionId(thread.id);
    props.setError("");
    try {
      const client = await props.ensureConnected();
      const response = await client.updateThreadMetadata({
        threadId: thread.id,
        isPinned: !thread.isPinned,
      });
      replaceInHistory(response.thread);
      props.dispatch({ type: "updateThread", thread: response.thread });
      return true;
    } catch (pinError) {
      props.setError(errorMessage(pinError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [props.dispatch, props.ensureConnected, props.setError, replaceInHistory, threadActionId]);

  const archiveThread = useCallback(async (threadId: string) => {
    if (threadActionId || props.isThreadRunning(threadId)) return false;
    setThreadActionId(threadId);
    props.setError("");
    try {
      const client = await props.ensureConnected();
      await client.archiveThread({ threadId });
      if (threadId === threadIdRef.current) startNewTask();
      removeFromHistory(threadId);
      return true;
    } catch (archiveError) {
      props.setError(errorMessage(archiveError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [props.ensureConnected, props.isThreadRunning, props.setError, removeFromHistory, startNewTask, threadActionId]);

  const unarchiveThread = useCallback(async (threadId: string) => {
    if (threadActionId) return false;
    setThreadActionId(threadId);
    props.setError("");
    try {
      const client = await props.ensureConnected();
      await client.unarchiveThread({ threadId });
      removeFromHistory(threadId);
      return true;
    } catch (unarchiveError) {
      props.setError(errorMessage(unarchiveError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [props.ensureConnected, props.setError, removeFromHistory, threadActionId]);

  const deleteThread = useCallback(async (threadId: string) => {
    if (threadActionId || props.isThreadRunning(threadId)) return false;
    setThreadActionId(threadId);
    props.setError("");
    try {
      const client = await props.ensureConnected();
      await client.deleteThread({ threadId });
      if (threadId === threadIdRef.current) startNewTask();
      removeFromHistory(threadId);
      return true;
    } catch (deleteError) {
      props.setError(errorMessage(deleteError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [props.ensureConnected, props.isThreadRunning, props.setError, removeFromHistory, startNewTask, threadActionId]);

  const forkThread = useCallback(async (threadId: string) => {
    if (threadActionId || props.isThreadRunning(threadId)) return false;
    setThreadActionId(threadId);
    props.setError("");
    try {
      const client = await props.ensureConnected();
      const response = await client.forkThread({ threadId, ephemeral: false });
      await unsubscribeIfIdle(threadIdRef.current);
      threadIdRef.current = response.thread.id;
      subscribedThreadIdsRef.current.add(response.thread.id);
      applyThreadRuntimeState(response.thread);
      props.dispatch({ type: "loadThread", thread: response.thread });
      showActiveWith(response.thread);
      return true;
    } catch (forkError) {
      props.setError(errorMessage(forkError));
      return false;
    } finally {
      setThreadActionId(null);
    }
  }, [applyThreadRuntimeState, props.dispatch, props.ensureConnected, props.isThreadRunning, props.setError, showActiveWith, threadActionId, unsubscribeIfIdle]);

  const startReview = useThreadReview({
    threadOperationRef,
    threadIdRef,
    subscribedThreadIdsRef,
    ensureActiveThread,
    unsubscribeIfIdle,
    dispatch: props.dispatch,
    markThreadRunning: props.markThreadRunning,
    setError: props.setError,
    upsertHistory,
  });

  const onTurnStarted = useCallback((notification: TurnStartedNotification) => {
    props.markThreadRunning(notification.threadId, notification.turn.id);
    if (notification.threadId === threadIdRef.current) props.setSubmitting(false);
  }, [props.markThreadRunning, props.setSubmitting]);

  const onTurnCompleted = useCallback((notification: TurnCompletedNotification) => {
    props.markThreadStopped(notification.threadId);
    if (notification.threadId === threadIdRef.current) {
      props.setSubmitting(false);
      props.dispatch({ type: "turnCompleted", notification });
      if (notification.turn.error) props.setError(notification.turn.error.message);
    } else {
      void unsubscribeIfIdle(notification.threadId);
    }
    void refreshHistory();
  }, [props.dispatch, props.markThreadStopped, props.setError, props.setSubmitting, refreshHistory, unsubscribeIfIdle]);

  const onThreadName = useCallback((notification: ThreadNameUpdatedNotification) => {
    renameInHistory(notification.threadId, notification.threadName ?? null);
    props.dispatch({
      type: "renameThread",
      threadId: notification.threadId,
      name: notification.threadName ?? null,
    });
  }, [props.dispatch, renameInHistory]);

  const onThreadStarted = useCallback((notification: ThreadStartedNotification) => {
    subscribedThreadIdsRef.current.add(notification.thread.id);
    applyThreadRuntimeState(notification.thread);
    if (!historyArchived && !notification.thread.ephemeral) {
      upsertHistory(notification.thread);
    }
  }, [applyThreadRuntimeState, historyArchived, upsertHistory]);

  const onThreadStatus = useCallback((notification: ThreadStatusChangedNotification) => {
    props.markThreadStatus(notification.threadId, notification.status);
    updateHistoryStatus(notification.threadId, notification.status);
    props.dispatch({
      type: "threadStatusChanged",
      threadId: notification.threadId,
      status: notification.status,
    });
  }, [props.dispatch, props.markThreadStatus, updateHistoryStatus]);

  const removeThread = useCallback((threadId: string) => {
    subscribedThreadIdsRef.current.delete(threadId);
    props.markThreadStopped(threadId);
    removeFromHistory(threadId);
    if (threadId === threadIdRef.current) startNewTask();
  }, [props.markThreadStopped, removeFromHistory, startNewTask]);

  const onThreadUnarchived = useCallback((threadId: string) => {
    if (historyArchived) removeFromHistory(threadId);
  }, [historyArchived, removeFromHistory]);

  const onThreadClosed = useCallback((threadId: string) => {
    subscribedThreadIdsRef.current.delete(threadId);
    props.markThreadStopped(threadId);
    const status = { type: "notLoaded" } as const;
    updateHistoryStatus(threadId, status);
    props.dispatch({ type: "threadStatusChanged", threadId, status });
  }, [props.dispatch, props.markThreadStopped, updateHistoryStatus]);

  const reset = useCallback(() => {
    threadIdRef.current = null;
    subscribedThreadIdsRef.current.clear();
    props.setSubmitting(false);
    props.dispatch({ type: "clear" });
  }, [props.dispatch, props.setSubmitting]);

  return {
    currentThreadId,
    ensureActiveThread,
    history,
    historyArchived,
    historyLoading,
    historyError,
    historyHasMore,
    openingThreadId,
    threadActionId,
    refreshHistory,
    showArchivedHistory,
    loadMoreHistory,
    send,
    steer,
    interrupt,
    openThread,
    startNewTask,
    renameThread,
    toggleThreadPin,
    archiveThread,
    unarchiveThread,
    deleteThread,
    forkThread,
    startReview,
    onTurnStarted,
    onTurnCompleted,
    onThreadName,
    onThreadStarted,
    onThreadStatus,
    removeThread,
    onThreadUnarchived,
    onThreadClosed,
    reset,
  };
}
