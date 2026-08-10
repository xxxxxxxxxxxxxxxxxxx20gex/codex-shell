import { useCallback, useEffect, useRef, useState } from "react";

export interface RuntimeLogEntry {
  id: number;
  receivedAt: number;
  line: string;
}

const MAX_RUNTIME_LOG_ENTRIES = 200;
const MAX_RUNTIME_LOG_LINE_CHARS = 4_000;
const LOG_FLUSH_INTERVAL_MS = 150;
const ANSI_ESCAPE_SEQUENCE = /\u001B(?:[@-_][0-?]*[ -/]*[@-~]|\[[0-?]*[ -/]*[@-~])/g;

export function normalizeRuntimeLogLine(line: string) {
  const source = line.slice(0, MAX_RUNTIME_LOG_LINE_CHARS + 256);
  const normalized = source.replace(ANSI_ESCAPE_SEQUENCE, "");
  if (line.length === source.length && normalized.length <= MAX_RUNTIME_LOG_LINE_CHARS) {
    return normalized;
  }
  return `${normalized.slice(0, MAX_RUNTIME_LOG_LINE_CHARS)}…（该行已截断）`;
}

export function appendRuntimeLogs(
  current: RuntimeLogEntry[],
  additions: RuntimeLogEntry[],
) {
  if (additions.length >= MAX_RUNTIME_LOG_ENTRIES) {
    return additions.slice(-MAX_RUNTIME_LOG_ENTRIES);
  }
  return [...current, ...additions].slice(-MAX_RUNTIME_LOG_ENTRIES);
}

export function useRuntimeLogs() {
  const [entries, setEntries] = useState<RuntimeLogEntry[]>([]);
  const pendingRef = useRef<RuntimeLogEntry[]>([]);
  const sequenceRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    flushTimerRef.current = null;
    const pending = pendingRef.current;
    if (pending.length === 0) return;
    pendingRef.current = [];
    setEntries((current) => appendRuntimeLogs(current, pending));
  }, []);

  const enqueue = useCallback((line: string) => {
    const entry = {
      id: sequenceRef.current++,
      receivedAt: Date.now(),
      line: normalizeRuntimeLogLine(line),
    };
    pendingRef.current = appendRuntimeLogs(pendingRef.current, [entry]);
    flushTimerRef.current ??= setTimeout(flush, LOG_FLUSH_INTERVAL_MS);
  }, [flush]);

  const clear = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
    pendingRef.current = [];
    setEntries([]);
  }, []);

  useEffect(() => () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
  }, []);

  return { entries, enqueue, clear };
}
