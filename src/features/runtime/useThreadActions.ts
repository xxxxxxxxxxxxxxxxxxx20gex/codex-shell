import { useCallback, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { errorMessage } from "../../shared/errors";
import type { AppServerClient } from "./appServerClient";
import type { AgentSessionAction } from "./sessionState";

interface Props {
  threadIdRef: MutableRefObject<string | null>;
  threadOperationRef: MutableRefObject<boolean>;
  subscribedThreadIdsRef: MutableRefObject<Set<string>>;
  ensureConnected: () => Promise<AppServerClient>;
  isThreadRunning: (threadId: string) => boolean;
  setError: Dispatch<SetStateAction<string>>;
  dispatch: Dispatch<AgentSessionAction>;
  applyThreadRuntimeState: (thread: Thread) => void;
  clearActiveThread: () => void;
  clearQueuedThread: (threadId: string) => void;
  removeFromHistory: (threadId: string) => void;
  renameInHistory: (threadId: string, name: string | null) => void;
  replaceInHistory: (thread: Thread) => void;
  showActiveWith: (thread: Thread) => void;
  unsubscribeIfIdle: (threadId: string | null) => Promise<void>;
}

export function useThreadActions({
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
}: Props) {
  const actionRef = useRef<{ threadId: string; token: symbol } | null>(null);
  const [threadActionId, setThreadActionId] = useState<string | null>(null);

  const beginAction = useCallback((threadId: string) => {
    if (threadOperationRef.current || actionRef.current) return null;
    const token = Symbol(threadId);
    threadOperationRef.current = true;
    actionRef.current = { threadId, token };
    setThreadActionId(threadId);
    return token;
  }, [threadOperationRef]);

  const isCurrent = useCallback((token: symbol) => actionRef.current?.token === token, []);

  const finishAction = useCallback((token: symbol) => {
    if (actionRef.current?.token !== token) return;
    actionRef.current = null;
    threadOperationRef.current = false;
    setThreadActionId(null);
  }, [threadOperationRef]);

  const isActionInProgress = useCallback(() => actionRef.current !== null, []);

  const invalidateActions = useCallback(() => {
    if (actionRef.current) threadOperationRef.current = false;
    actionRef.current = null;
    setThreadActionId(null);
  }, [threadOperationRef]);

  const renameThread = useCallback(async (threadId: string, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return false;
    const token = beginAction(threadId);
    if (!token) return false;
    setError("");
    try {
      const client = await ensureConnected();
      if (!isCurrent(token)) return false;
      await client.setThreadName({ threadId, name: normalizedName });
      if (!isCurrent(token)) return false;
      renameInHistory(threadId, normalizedName);
      dispatch({ type: "renameThread", threadId, name: normalizedName });
      return true;
    } catch (renameError) {
      if (isCurrent(token)) setError(errorMessage(renameError));
      return false;
    } finally {
      finishAction(token);
    }
  }, [beginAction, dispatch, ensureConnected, finishAction, isCurrent, renameInHistory, setError]);

  const toggleThreadPin = useCallback(async (thread: Thread) => {
    const token = beginAction(thread.id);
    if (!token) return false;
    setError("");
    try {
      const client = await ensureConnected();
      if (!isCurrent(token)) return false;
      const response = await client.updateThreadMetadata({
        threadId: thread.id,
        isPinned: !thread.isPinned,
      });
      if (!isCurrent(token)) return false;
      replaceInHistory(response.thread);
      dispatch({ type: "updateThread", thread: response.thread });
      return true;
    } catch (pinError) {
      if (isCurrent(token)) setError(errorMessage(pinError));
      return false;
    } finally {
      finishAction(token);
    }
  }, [beginAction, dispatch, ensureConnected, finishAction, isCurrent, replaceInHistory, setError]);

  const removeThreadFromServer = useCallback(async (
    threadId: string,
    remove: (client: AppServerClient, threadId: string) => Promise<unknown>,
  ) => {
    if (isThreadRunning(threadId)) return false;
    const token = beginAction(threadId);
    if (!token) return false;
    setError("");
    try {
      const client = await ensureConnected();
      if (!isCurrent(token)) return false;
      await remove(client, threadId);
      if (!isCurrent(token)) return false;
      clearQueuedThread(threadId);
      if (threadId === threadIdRef.current) clearActiveThread();
      removeFromHistory(threadId);
      return true;
    } catch (removeError) {
      if (isCurrent(token)) setError(errorMessage(removeError));
      return false;
    } finally {
      finishAction(token);
    }
  }, [beginAction, clearActiveThread, clearQueuedThread, ensureConnected, finishAction, isCurrent, isThreadRunning, removeFromHistory, setError, threadIdRef]);

  const archiveThread = useCallback(
    (threadId: string) => removeThreadFromServer(threadId, (client, id) => client.archiveThread({ threadId: id })),
    [removeThreadFromServer],
  );

  const unarchiveThread = useCallback(async (threadId: string) => {
    const token = beginAction(threadId);
    if (!token) return false;
    setError("");
    try {
      const client = await ensureConnected();
      if (!isCurrent(token)) return false;
      await client.unarchiveThread({ threadId });
      if (!isCurrent(token)) return false;
      removeFromHistory(threadId);
      return true;
    } catch (unarchiveError) {
      if (isCurrent(token)) setError(errorMessage(unarchiveError));
      return false;
    } finally {
      finishAction(token);
    }
  }, [beginAction, ensureConnected, finishAction, isCurrent, removeFromHistory, setError]);

  const deleteThread = useCallback(
    (threadId: string) => removeThreadFromServer(threadId, (client, id) => client.deleteThread({ threadId: id })),
    [removeThreadFromServer],
  );

  const forkThread = useCallback(async (threadId: string, lastTurnId?: string) => {
    if (!lastTurnId && isThreadRunning(threadId)) return false;
    const token = beginAction(threadId);
    if (!token) return false;
    setError("");
    try {
      const client = await ensureConnected();
      if (!isCurrent(token)) return false;
      const response = await client.forkThread({ threadId, lastTurnId, ephemeral: false });
      if (!isCurrent(token)) return false;
      await unsubscribeIfIdle(threadIdRef.current);
      if (!isCurrent(token)) return false;
      threadIdRef.current = response.thread.id;
      subscribedThreadIdsRef.current.add(response.thread.id);
      applyThreadRuntimeState(response.thread);
      dispatch({ type: "loadThread", thread: response.thread });
      showActiveWith(response.thread);
      return true;
    } catch (forkError) {
      if (isCurrent(token)) setError(errorMessage(forkError));
      return false;
    } finally {
      finishAction(token);
    }
  }, [applyThreadRuntimeState, beginAction, dispatch, ensureConnected, finishAction, isCurrent, isThreadRunning, setError, showActiveWith, subscribedThreadIdsRef, threadIdRef, unsubscribeIfIdle]);

  return {
    threadActionId,
    isActionInProgress,
    invalidateActions,
    renameThread,
    toggleThreadPin,
    archiveThread,
    unarchiveThread,
    deleteThread,
    forkThread,
  };
}
