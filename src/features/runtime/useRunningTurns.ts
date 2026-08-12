import { useCallback, useRef, useState } from "react";
import type { ThreadActiveFlag } from "../../generated/app-server/v2/ThreadActiveFlag";
import type { ThreadStatus } from "../../generated/app-server/v2/ThreadStatus";

export type RunningTurnKind = "regular" | "review" | "compact" | "unknown";

export interface RunningTurn {
  turnId: string | null;
  kind: RunningTurnKind;
  activeFlags: ThreadActiveFlag[];
}

export type RunningTurnChange =
  | {
      type: "started";
      threadId: string;
      turnId: string | null;
      kind: RunningTurnKind;
    }
  | { type: "active"; threadId: string; activeFlags: ThreadActiveFlag[] }
  | { type: "stopped"; threadId: string }
  | { type: "cleared" };

function equalFlags(left: ThreadActiveFlag[], right: ThreadActiveFlag[]) {
  return left.length === right.length && left.every((flag, index) => flag === right[index]);
}

export function updateRunningTurns(
  current: ReadonlyMap<string, RunningTurn>,
  change: RunningTurnChange,
): ReadonlyMap<string, RunningTurn> {
  if (change.type === "cleared") return current.size === 0 ? current : new Map();
  if (change.type === "stopped") {
    if (!current.has(change.threadId)) return current;
    const next = new Map(current);
    next.delete(change.threadId);
    return next;
  }
  if (change.type === "active") {
    const existing = current.get(change.threadId);
    if (existing && equalFlags(existing.activeFlags, change.activeFlags)) return current;
    return new Map(current).set(change.threadId, {
      turnId: existing?.turnId ?? null,
      kind: existing?.kind ?? "unknown",
      activeFlags: [...change.activeFlags],
    });
  }

  const existing = current.get(change.threadId);
  const kind = change.kind === "unknown" && existing && existing.kind !== "unknown"
    ? existing.kind
    : change.kind;
  if (existing
    && existing.turnId === change.turnId
    && existing.kind === kind) return current;
  return new Map(current).set(change.threadId, {
    turnId: change.turnId,
    kind,
    activeFlags: existing?.activeFlags ?? [],
  });
}

export function canSteerRunningTurn(turn: RunningTurn | undefined): turn is RunningTurn & { turnId: string } {
  return turn?.kind === "regular"
    && turn.turnId !== null
    && turn.activeFlags.length === 0;
}

export function runningTurnLabel(turn: RunningTurn | undefined) {
  if (!turn) return null;
  if (turn.activeFlags.includes("waitingOnApproval")) return "等待批准";
  if (turn.activeFlags.includes("waitingOnUserInput")) return "等待输入";
  if (turn.kind === "regular" && turn.turnId) return "执行中 · Enter 插入";
  if (turn.kind === "review") return "正在代码审查";
  if (turn.kind === "compact") return "正在压缩上下文";
  return "正在执行";
}

export function useRunningTurns() {
  const runningTurnsRef = useRef<ReadonlyMap<string, RunningTurn>>(new Map());
  const [runningTurns, setRunningTurns] = useState<ReadonlyMap<string, RunningTurn>>(
    () => new Map(),
  );

  const apply = useCallback((change: RunningTurnChange) => {
    const next = updateRunningTurns(runningTurnsRef.current, change);
    if (next === runningTurnsRef.current) return;
    runningTurnsRef.current = next;
    setRunningTurns(next);
  }, []);

  const markThreadRunning = useCallback((
    threadId: string,
    turnId: string | null,
    kind: RunningTurnKind,
  ) => {
    apply({ type: "started", threadId, turnId, kind });
  }, [apply]);
  const markThreadStopped = useCallback((threadId: string) => {
    apply({ type: "stopped", threadId });
  }, [apply]);
  const markThreadStatus = useCallback((threadId: string, status: ThreadStatus) => {
    apply(status.type === "active"
      ? { type: "active", threadId, activeFlags: status.activeFlags }
      : { type: "stopped", threadId });
  }, [apply]);
  const clearRunningTurns = useCallback(() => apply({ type: "cleared" }), [apply]);
  const getRunningTurn = useCallback(
    (threadId: string) => runningTurnsRef.current.get(threadId),
    [],
  );
  const isThreadRunning = useCallback(
    (threadId: string) => runningTurnsRef.current.has(threadId),
    [],
  );

  return {
    runningTurns,
    markThreadRunning,
    markThreadStopped,
    markThreadStatus,
    clearRunningTurns,
    getRunningTurn,
    isThreadRunning,
  };
}
