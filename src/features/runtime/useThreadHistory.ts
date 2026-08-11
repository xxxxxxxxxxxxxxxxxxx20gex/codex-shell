import { useCallback, useEffect, useRef, useState, type Dispatch } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { ThreadStatus } from "../../generated/app-server/v2/ThreadStatus";
import { errorMessage } from "../../shared/errors";
import type { AppServerClient } from "./appServerClient";
import type { AgentSessionAction } from "./sessionState";

interface Props {
  ensureConnected: () => Promise<AppServerClient>;
  dispatch: Dispatch<AgentSessionAction>;
  currentThreadId: () => string | null;
}

function mergeThread(threads: Thread[], thread: Thread) {
  return [thread, ...threads.filter((item) => item.id !== thread.id)];
}

export function useThreadHistory({ ensureConnected, dispatch, currentThreadId }: Props) {
  const initialLoadStartedRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const archivedRef = useRef(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [archived, setArchived] = useState(false);

  const load = useCallback(async (append: boolean, archivedView: boolean) => {
    const requestId = ++requestSequenceRef.current;
    setLoading(true);
    setError("");
    try {
      const client = await ensureConnected();
      const response = await client.listThreads({
        cursor: append ? nextCursorRef.current : null,
        limit: 30,
        sortKey: "recency_at",
        sortDirection: "desc",
        archived: archivedView,
      });
      if (requestId !== requestSequenceRef.current) return;
      const listedThreads = response.data.filter((thread) => !thread.ephemeral);
      const active = listedThreads.find((thread) => thread.id === currentThreadId());
      if (active) dispatch({ type: "updateThread", thread: active });
      setThreads((current) => {
        if (append) {
          const byId = new Map(current.map((thread) => [thread.id, thread]));
          listedThreads.forEach((thread) => byId.set(thread.id, thread));
          return [...byId.values()];
        }
        if (archivedView) return listedThreads;
        const currentActive = current.find((thread) => thread.id === currentThreadId());
        return currentActive && !active ? [currentActive, ...listedThreads] : listedThreads;
      });
      nextCursorRef.current = response.nextCursor;
      setHasMore(response.nextCursor !== null);
    } catch (loadError) {
      if (requestId === requestSequenceRef.current) setError(errorMessage(loadError));
    } finally {
      if (requestId === requestSequenceRef.current) setLoading(false);
    }
  }, [currentThreadId, dispatch, ensureConnected]);

  const refresh = useCallback((append = false) => (
    load(append, archivedRef.current)
  ), [load]);

  const loadMore = useCallback(() => refresh(true), [refresh]);

  useEffect(() => {
    if (initialLoadStartedRef.current) return;
    initialLoadStartedRef.current = true;
    void refresh();
  }, [refresh]);

  const showArchived = useCallback((nextArchived: boolean) => {
    if (nextArchived === archivedRef.current) return;
    archivedRef.current = nextArchived;
    nextCursorRef.current = null;
    setArchived(nextArchived);
    setHasMore(false);
    setThreads([]);
    void load(false, nextArchived);
  }, [load]);

  const upsert = useCallback((thread: Thread) => {
    setThreads((current) => mergeThread(current, thread));
  }, []);

  const replace = useCallback((thread: Thread) => {
    setThreads((current) => current.map((item) => item.id === thread.id ? thread : item));
  }, []);

  const rename = useCallback((threadId: string, name: string | null) => {
    setThreads((current) => current.map((thread) => thread.id === threadId
      ? { ...thread, name }
      : thread));
  }, []);

  const updateStatus = useCallback((threadId: string, status: ThreadStatus) => {
    setThreads((current) => current.map((thread) => thread.id === threadId
      ? { ...thread, status }
      : thread));
  }, []);

  const remove = useCallback((threadId: string) => {
    setThreads((current) => current.filter((thread) => thread.id !== threadId));
  }, []);

  const showActiveWith = useCallback((thread: Thread) => {
    const wasArchived = archivedRef.current;
    requestSequenceRef.current += 1;
    archivedRef.current = false;
    nextCursorRef.current = null;
    setArchived(false);
    setLoading(false);
    setHasMore(false);
    setThreads((current) => wasArchived ? [thread] : mergeThread(current, thread));
  }, []);

  return {
    threads,
    archived,
    loading,
    error,
    hasMore,
    refresh,
    loadMore,
    showArchived,
    upsert,
    replace,
    rename,
    updateStatus,
    remove,
    showActiveWith,
  };
}
