export interface RuntimeLogEntry {
  id: number;
  receivedAt: number;
  line: string;
}

const MAX_RUNTIME_LOG_ENTRIES = 200;
const MAX_RUNTIME_LOG_LINE_CHARS = 4_000;
const LOG_FLUSH_INTERVAL_MS = 150;
// eslint-disable-next-line no-control-regex -- ANSI terminal sequences start with ESC.
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

export class RuntimeLogStore {
  private entries: RuntimeLogEntry[] = [];
  private pending: RuntimeLogEntry[] = [];
  private listeners = new Set<() => void>();
  private sequence = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  getSnapshot = () => this.entries;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  enqueue = (line: string) => {
    const entry = {
      id: this.sequence++,
      receivedAt: Date.now(),
      line: normalizeRuntimeLogLine(line),
    };
    this.pending = appendRuntimeLogs(this.pending, [entry]);
    this.flushTimer ??= setTimeout(this.flush, LOG_FLUSH_INTERVAL_MS);
  };

  clear = () => {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.pending = [];
    if (this.entries.length === 0) return;
    this.entries = [];
    this.emitChange();
  };

  dispose = () => {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.pending = [];
    this.listeners.clear();
  };

  private flush = () => {
    this.flushTimer = null;
    if (this.pending.length === 0) return;
    this.entries = appendRuntimeLogs(this.entries, this.pending);
    this.pending = [];
    this.emitChange();
  };

  private emitChange() {
    this.listeners.forEach((listener) => listener());
  }
}
