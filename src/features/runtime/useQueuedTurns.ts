import { useCallback, useRef, useState } from "react";
import type { ModeKind } from "../../generated/app-server/ModeKind";
import type { PermissionMode } from "../approvals/permissionModes";
import type { ModelSettings } from "../models/types";
import type { FileMention, SkillMention } from "./sessionInput";

export const MAX_QUEUED_TURNS_PER_THREAD = 10;

export interface QueuedTurnInput {
  id: string;
  text: string;
  mentions: FileMention[];
  skills: SkillMention[];
  collaborationMode: ModeKind;
  settings: ModelSettings;
  permissionMode: PermissionMode;
}

let nextQueuedTurnId = 0;

function queuedTurnId() {
  nextQueuedTurnId += 1;
  return `queued-turn-${Date.now()}-${nextQueuedTurnId}`;
}

export function useQueuedTurns() {
  const queuedTurnsRef = useRef<ReadonlyMap<string, QueuedTurnInput[]>>(new Map());
  const [queuedTurns, setQueuedTurns] = useState<ReadonlyMap<string, QueuedTurnInput[]>>(
    () => new Map(),
  );

  const replace = useCallback((next: ReadonlyMap<string, QueuedTurnInput[]>) => {
    queuedTurnsRef.current = next;
    setQueuedTurns(next);
  }, []);

  const enqueue = useCallback((
    threadId: string,
    input: Omit<QueuedTurnInput, "id">,
  ) => {
    const current = queuedTurnsRef.current.get(threadId) ?? [];
    if (current.length >= MAX_QUEUED_TURNS_PER_THREAD) return false;
    const next = new Map(queuedTurnsRef.current);
    next.set(threadId, [...current, { ...input, id: queuedTurnId() }]);
    replace(next);
    return true;
  }, [replace]);

  const shift = useCallback((threadId: string) => {
    const current = queuedTurnsRef.current.get(threadId);
    if (!current?.length) return null;
    const [first, ...remaining] = current;
    const next = new Map(queuedTurnsRef.current);
    if (remaining.length) next.set(threadId, remaining);
    else next.delete(threadId);
    replace(next);
    return first;
  }, [replace]);

  const restoreFront = useCallback((threadId: string, input: QueuedTurnInput) => {
    const current = queuedTurnsRef.current.get(threadId) ?? [];
    const next = new Map(queuedTurnsRef.current);
    next.set(threadId, [input, ...current]);
    replace(next);
  }, [replace]);

  const remove = useCallback((threadId: string, queuedTurnIdToRemove: string) => {
    const current = queuedTurnsRef.current.get(threadId);
    if (!current?.some((input) => input.id === queuedTurnIdToRemove)) return;
    const remaining = current.filter((input) => input.id !== queuedTurnIdToRemove);
    const next = new Map(queuedTurnsRef.current);
    if (remaining.length) next.set(threadId, remaining);
    else next.delete(threadId);
    replace(next);
  }, [replace]);

  const clearThread = useCallback((threadId: string) => {
    if (!queuedTurnsRef.current.has(threadId)) return;
    const next = new Map(queuedTurnsRef.current);
    next.delete(threadId);
    replace(next);
  }, [replace]);

  const clear = useCallback(() => {
    if (queuedTurnsRef.current.size) replace(new Map());
  }, [replace]);

  const get = useCallback(
    (threadId: string) => queuedTurnsRef.current.get(threadId) ?? [],
    [],
  );

  return { queuedTurns, enqueue, shift, restoreFront, remove, clearThread, clear, get };
}
