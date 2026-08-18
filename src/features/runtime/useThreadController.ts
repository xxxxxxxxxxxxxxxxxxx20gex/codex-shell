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
import type { ApprovalReviewerMode, PermissionMode } from "../approvals/permissionModes";
import type { ModelSettings, PersonalizationSettings } from "../models/types";
import type { AppServerClient } from "./appServerClient";
import type { AgentSessionAction } from "./sessionState";
import type { FileMention, ImageAttachment, SkillMention } from "./sessionInput";
import { useQueuedTurns } from "./useQueuedTurns";
import type { RunningTurn, RunningTurnKind } from "./useRunningTurns";
import { useThreadActions } from "./useThreadActions";
import { useThreadHistory } from "./useThreadHistory";
import { useThreadReview } from "./useThreadReview";
import { useTurnExecution } from "./useTurnExecution";

type EnsureConnected = () => Promise<AppServerClient>;

interface Props {
  clientRef: MutableRefObject<AppServerClient | null>;
  ensureConnected: EnsureConnected;
  settings: ModelSettings;
  personalization?: PersonalizationSettings;
  permissionMode: PermissionMode;
  approvalReviewer: ApprovalReviewerMode;
  projectCwd: string | null;
  dispatch: Dispatch<AgentSessionAction>;
  submitting: boolean;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  markThreadRunning: (threadId: string, turnId: string | null, kind: RunningTurnKind) => void;
  markThreadStopped: (threadId: string) => void;
  markThreadStatus: (threadId: string, status: Thread["status"]) => void;
  getRunningTurn: (threadId: string) => RunningTurn | undefined;
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
  const {
    approvalReviewer,
    clientRef,
    dispatch,
    ensureConnected,
    getRunningTurn,
    isThreadRunning,
    markThreadRunning,
    markThreadStatus,
    markThreadStopped,
    permissionMode,
    projectCwd,
    setError,
    setSubmitting,
    settings,
    personalization = { customInstructions: "", theme: "dark" },
    submitting,
  } = props;
  const threadIdRef = useRef<string | null>(null);
  const threadOperationRef = useRef(false);
  const subscribedThreadIdsRef = useRef(new Set<string>());
  const [openingThreadId, setOpeningThreadId] = useState<string | null>(null);
  const {
    queuedTurns: queuedTurnsByThread,
    enqueue: enqueueQueued,
    shift: shiftQueued,
    restoreFront: restoreQueuedFront,
    remove: removeQueuedInput,
    clearThread: clearQueuedThread,
    clear: clearQueued,
    get: getQueued,
  } = useQueuedTurns();

  const currentThreadId = useCallback(() => threadIdRef.current, []);
  const threadHistory = useThreadHistory({
    ensureConnected: ensureConnected,
    dispatch: dispatch,
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
    if (runningTurn) markThreadRunning(thread.id, runningTurn.id, "unknown");
    else markThreadStatus(thread.id, thread.status);
  }, [markThreadRunning, markThreadStatus]);

  const unsubscribeIfIdle = useCallback(async (threadId: string | null) => {
    if (!threadId || isThreadRunning(threadId) || !subscribedThreadIdsRef.current.has(threadId)) {
      return;
    }
    subscribedThreadIdsRef.current.delete(threadId);
    try {
      const client = await ensureConnected();
      await client.unsubscribeThread({ threadId });
    } catch (unsubscribeError) {
      subscribedThreadIdsRef.current.add(threadId);
      setError(errorMessage(unsubscribeError));
    }
  }, [ensureConnected, isThreadRunning, setError]);

  const ensureActiveThread = useCallback(async () => {
    const threadId = threadIdRef.current;
    if (!threadId) throw new Error("请先发送一条消息创建 Session");
    const client = await ensureConnected();
    if (!subscribedThreadIdsRef.current.has(threadId)) {
      const response = await client.resumeThread({ threadId });
      subscribedThreadIdsRef.current.add(threadId);
      dispatch({ type: "loadThread", thread: response.thread });
      applyThreadRuntimeState(response.thread);
    }
    return { client, threadId };
  }, [applyThreadRuntimeState, dispatch, ensureConnected]);

  const { send, sendQueued, steer, interrupt } = useTurnExecution({
    clientRef: clientRef,
    threadIdRef,
    threadOperationRef,
    subscribedThreadIdsRef,
    ensureConnected: ensureConnected,
    ensureActiveThread,
    settings: settings,
    personalization,
    permissionMode: permissionMode,
    approvalReviewer: approvalReviewer,
    projectCwd: projectCwd,
    submitting: submitting,
    setSubmitting: setSubmitting,
    setError: setError,
    dispatch: dispatch,
    getRunningTurn: getRunningTurn,
    isThreadRunning: isThreadRunning,
    markThreadRunning: markThreadRunning,
    markThreadStopped: markThreadStopped,
    showActiveWith,
  });

  const queue = useCallback((
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
    collaborationMode: ModeKind = "default",
    images: ImageAttachment[] = [],
  ) => {
    const message = text.trim();
    const threadId = threadIdRef.current;
    if ((!message && mentions.length === 0 && images.length === 0)
      || !threadId || (!submitting && !isThreadRunning(threadId))) return false;
    const accepted = enqueueQueued(threadId, {
      text: message,
      mentions: [...mentions],
      skills: [...skills],
      collaborationMode,
      images: [...images],
      settings: { ...settings },
      permissionMode: permissionMode,
      approvalReviewer: approvalReviewer,
    });
    if (!accepted) setError("当前 Session 最多排队 10 条消息");
    return accepted;
  }, [approvalReviewer, isThreadRunning, permissionMode, setError, settings, submitting, enqueueQueued]);

  const sendNextQueued = useCallback(async (threadId: string) => {
    const next = shiftQueued(threadId);
    if (!next) return false;
    const sent = await sendQueued(threadId, next);
    if (!sent) restoreQueuedFront(threadId, next);
    return sent;
  }, [restoreQueuedFront, shiftQueued, sendQueued]);

  const clearActiveThread = useCallback(() => {
    const previousThreadId = threadIdRef.current;
    threadIdRef.current = null;
    setSubmitting(false);
    setError("");
    dispatch({ type: "clear" });
    showArchivedHistory(false);
    void unsubscribeIfIdle(previousThreadId);
  }, [dispatch, setError, setSubmitting, showArchivedHistory, unsubscribeIfIdle]);

  const {
    threadActionId,
    isActionInProgress,
    invalidateActions,
    renameThread,
    toggleThreadPin,
    archiveThread,
    unarchiveThread,
    deleteThread,
    forkThread,
  } = useThreadActions({
    threadIdRef,
    threadOperationRef,
    subscribedThreadIdsRef,
    ensureConnected,
    isThreadRunning,
    setError,
    dispatch,
    applyThreadRuntimeState,
    clearActiveThread,
    clearQueuedThread,
    removeFromHistory,
    renameInHistory,
    replaceInHistory,
    showActiveWith,
    unsubscribeIfIdle,
  });

  const openThread = useCallback(async (threadId: string) => {
    if (threadOperationRef.current || isActionInProgress() || threadId === threadIdRef.current) return;
    threadOperationRef.current = true;
    setOpeningThreadId(threadId);
    setError("");
    const previousThreadId = threadIdRef.current;
    try {
      await unsubscribeIfIdle(previousThreadId);
      const client = await ensureConnected();
      let openedThread: Thread;
      try {
        openedThread = (await client.readThread({ threadId, includeTurns: true })).thread;
      } catch (readError) {
        if (!canResumeAfterReadError(readError)) throw readError;
        openedThread = (await client.resumeThread({ threadId })).thread;
        subscribedThreadIdsRef.current.add(threadId);
      }
      threadIdRef.current = openedThread.id;
      applyThreadRuntimeState(openedThread);
      setSubmitting(false);
      dispatch({ type: "loadThread", thread: openedThread });
    } catch (readError) {
      setError(errorMessage(readError));
    } finally {
      threadOperationRef.current = false;
      setOpeningThreadId(null);
    }
  }, [
    applyThreadRuntimeState,
    dispatch,
    ensureConnected,
    setError,
    setSubmitting,
    isActionInProgress,
    unsubscribeIfIdle,
  ]);

  const startNewTask = useCallback(() => {
    if (threadOperationRef.current || isActionInProgress()) return;
    clearActiveThread();
  }, [clearActiveThread, isActionInProgress]);

  const startReview = useThreadReview({
    threadOperationRef,
    threadIdRef,
    subscribedThreadIdsRef,
    ensureActiveThread,
    unsubscribeIfIdle,
    dispatch: dispatch,
    markThreadRunning: markThreadRunning,
    setError: setError,
    upsertHistory,
  });

  const onTurnStarted = useCallback((notification: TurnStartedNotification) => {
    markThreadRunning(notification.threadId, notification.turn.id, "unknown");
    if (notification.threadId === threadIdRef.current) {
      setSubmitting(false);
      dispatch({
        type: "turnStarted",
        turn: notification.turn,
        startedAt: Date.now() / 1_000,
      });
    }
  }, [dispatch, markThreadRunning, setSubmitting]);

  const onTurnCompleted = useCallback((notification: TurnCompletedNotification) => {
    markThreadStopped(notification.threadId);
    if (notification.threadId === threadIdRef.current) {
      setSubmitting(false);
      dispatch({
        type: "turnCompleted",
        notification,
        completedAt: Date.now() / 1_000,
      });
      if (notification.turn.error) setError(notification.turn.error.message);
    } else if (notification.turn.status !== "completed" || getQueued(notification.threadId).length === 0) {
      void unsubscribeIfIdle(notification.threadId);
    }
    if (notification.turn.status === "completed" && getQueued(notification.threadId).length > 0) {
      void sendNextQueued(notification.threadId);
    }
    void refreshHistory();
  }, [dispatch, markThreadStopped, setError, setSubmitting, getQueued, refreshHistory, sendNextQueued, unsubscribeIfIdle]);

  const onThreadName = useCallback((notification: ThreadNameUpdatedNotification) => {
    renameInHistory(notification.threadId, notification.threadName ?? null);
    dispatch({
      type: "renameThread",
      threadId: notification.threadId,
      name: notification.threadName ?? null,
    });
  }, [dispatch, renameInHistory]);

  const onThreadStarted = useCallback((notification: ThreadStartedNotification) => {
    subscribedThreadIdsRef.current.add(notification.thread.id);
    applyThreadRuntimeState(notification.thread);
    if (!historyArchived && !notification.thread.ephemeral) {
      upsertHistory(notification.thread);
    }
  }, [applyThreadRuntimeState, historyArchived, upsertHistory]);

  const onThreadStatus = useCallback((notification: ThreadStatusChangedNotification) => {
    markThreadStatus(notification.threadId, notification.status);
    updateHistoryStatus(notification.threadId, notification.status);
    dispatch({
      type: "threadStatusChanged",
      threadId: notification.threadId,
      status: notification.status,
    });
  }, [dispatch, markThreadStatus, updateHistoryStatus]);

  const removeThread = useCallback((threadId: string) => {
    subscribedThreadIdsRef.current.delete(threadId);
    markThreadStopped(threadId);
    clearQueuedThread(threadId);
    removeFromHistory(threadId);
    if (threadId === threadIdRef.current) startNewTask();
  }, [markThreadStopped, clearQueuedThread, removeFromHistory, startNewTask]);

  const onThreadUnarchived = useCallback((threadId: string) => {
    if (historyArchived) removeFromHistory(threadId);
  }, [historyArchived, removeFromHistory]);

  const onThreadClosed = useCallback((threadId: string) => {
    subscribedThreadIdsRef.current.delete(threadId);
    markThreadStopped(threadId);
    clearQueuedThread(threadId);
    const status = { type: "notLoaded" } as const;
    updateHistoryStatus(threadId, status);
    dispatch({ type: "threadStatusChanged", threadId, status });
  }, [dispatch, markThreadStopped, clearQueuedThread, updateHistoryStatus]);

  const reset = useCallback(() => {
    invalidateActions();
    threadIdRef.current = null;
    subscribedThreadIdsRef.current.clear();
    clearQueued();
    setSubmitting(false);
    dispatch({ type: "clear" });
  }, [clearQueued, dispatch, invalidateActions, setSubmitting]);

  const removeQueued = useCallback((queuedTurnId: string) => {
    const threadId = threadIdRef.current;
    if (threadId) removeQueuedInput(threadId, queuedTurnId);
  }, [removeQueuedInput]);

  const resumeQueued = useCallback(async () => {
    const threadId = threadIdRef.current;
    if (!threadId || submitting || isThreadRunning(threadId)) return false;
    return sendNextQueued(threadId);
  }, [isThreadRunning, submitting, sendNextQueued]);

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
    queue,
    queuedTurns: threadIdRef.current ? queuedTurnsByThread.get(threadIdRef.current) ?? [] : [],
    removeQueued,
    resumeQueued,
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
