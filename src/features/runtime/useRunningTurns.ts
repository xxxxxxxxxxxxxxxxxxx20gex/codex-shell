import { useCallback, useRef, useState } from "react";
import type { ThreadStatus } from "../../generated/app-server/v2/ThreadStatus";

export type RunningTurnChange =
  | { type: "started"; threadId: string; turnId: string }
  | { type: "active"; threadId: string }
  | { type: "stopped"; threadId: string }
  | { type: "cleared" };

export function updateRunningTurns(
  current: ReadonlyMap<string, string | null>,
  change: RunningTurnChange,
): ReadonlyMap<string, string | null> {
  if (change.type === "cleared") return current.size === 0 ? current : new Map();
  if (change.type === "stopped") {
    if (!current.has(change.threadId)) return current;
    const next = new Map(current);
    next.delete(change.threadId);
    return next;
  }
  if (change.type === "active") {
    if (current.has(change.threadId)) return current;
    return new Map(current).set(change.threadId, null);
  }
  if (current.get(change.threadId) === change.turnId) return current;
  return new Map(current).set(change.threadId, change.turnId);
}

export function useRunningTurns() {
  const turnIdsRef = useRef<ReadonlyMap<string, string | null>>(new Map());
  const [runningThreadIds, setRunningThreadIds] = useState<ReadonlySet<string>>(() => new Set());

  const apply = useCallback((change: RunningTurnChange) => {
    const next = updateRunningTurns(turnIdsRef.current, change);
    if (next === turnIdsRef.current) return;
    turnIdsRef.current = next;
    setRunningThreadIds(new Set(next.keys()));
  }, []);

  const markThreadRunning = useCallback((threadId: string, turnId: string) => {
    apply({ type: "started", threadId, turnId });
  }, [apply]);
  const markThreadStopped = useCallback((threadId: string) => {
    apply({ type: "stopped", threadId });
  }, [apply]);
  const markThreadStatus = useCallback((threadId: string, status: ThreadStatus) => {
    apply(status.type === "active"
      ? { type: "active", threadId }
      : { type: "stopped", threadId });
  }, [apply]);
  const clearRunningTurns = useCallback(() => apply({ type: "cleared" }), [apply]);
  const getRunningTurnId = useCallback((threadId: string) => turnIdsRef.current.get(threadId) ?? undefined, []);
  const isThreadRunning = useCallback((threadId: string) => turnIdsRef.current.has(threadId), []);

  return {
    runningThreadIds,
    markThreadRunning,
    markThreadStopped,
    markThreadStatus,
    clearRunningTurns,
    getRunningTurnId,
    isThreadRunning,
  };
}
