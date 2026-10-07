type RuntimeNoticeKind = "info" | "warning" | "security" | "deprecation";
export type RuntimeNoticeDestination = "runtime" | "diagnostics";

export interface RuntimeNotice {
  id: number;
  kind: RuntimeNoticeKind;
  title: string;
  message: string;
  path?: string;
  destination: RuntimeNoticeDestination;
  receivedAt: number;
  threadId?: string;
  turnId?: string;
  category?: "modelBuffering";
}

export type RuntimeNoticeInput = Omit<RuntimeNotice, "id" | "receivedAt">;

const MAX_RUNTIME_NOTICES = 50;
const MAX_NOTICE_TITLE_CHARS = 200;
const MAX_NOTICE_MESSAGE_CHARS = 4_000;
const MAX_NOTICE_PATH_CHARS = 1_000;

function boundedText(value: string, limit: number) {
  return value.length <= limit ? value : `${value.slice(0, limit)}…`;
}

export class RuntimeNoticeStore {
  private entries: RuntimeNotice[] = [];
  private listeners = new Set<() => void>();
  private sequence = 0;
  private expiryTimers = new Map<number, ReturnType<typeof setTimeout>>();

  getSnapshot = () => this.entries;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  push = (notice: RuntimeNoticeInput) => {
    const boundedNotice = {
      ...notice,
      title: boundedText(notice.title, MAX_NOTICE_TITLE_CHARS),
      message: boundedText(notice.message, MAX_NOTICE_MESSAGE_CHARS),
      path: notice.path ? boundedText(notice.path, MAX_NOTICE_PATH_CHARS) : undefined,
    };
    const duplicateIndex = this.entries.findIndex((entry) => (
      entry.kind === boundedNotice.kind
      && entry.title === boundedNotice.title
      && entry.message === boundedNotice.message
      && entry.path === boundedNotice.path
      && entry.threadId === boundedNotice.threadId
      && entry.turnId === boundedNotice.turnId
      && entry.category === boundedNotice.category
    ));
    const entry = { ...boundedNotice, id: this.sequence++, receivedAt: Date.now() };
    const duplicate = duplicateIndex === -1 ? undefined : this.entries[duplicateIndex];
    if (duplicate) this.clearTimer(duplicate.id);
    const withoutDuplicate = duplicate ? this.entries.filter((_, index) => index !== duplicateIndex) : this.entries;
    const nextEntries = [...withoutDuplicate, entry];
    nextEntries.slice(0, -MAX_RUNTIME_NOTICES).forEach((oldEntry) => this.clearTimer(oldEntry.id));
    this.entries = nextEntries.slice(-MAX_RUNTIME_NOTICES);
    this.emitChange();
    if (entry.kind !== "security" && entry.category !== "modelBuffering") {
      const timer = setTimeout(() => this.dismiss(entry.id), entry.kind === "warning" ? 8_000 : 5_000);
      this.expiryTimers.set(entry.id, timer);
    }
    return entry.id;
  };

  dismiss = (id: number) => {
    this.clearTimer(id);
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length === this.entries.length) return;
    this.entries = next;
    this.emitChange();
  };

  dismissWhere = (predicate: (notice: RuntimeNotice) => boolean) => {
    this.entries.filter(predicate).forEach((notice) => this.dismiss(notice.id));
  };

  clear = () => {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.expiryTimers.forEach((timer) => clearTimeout(timer));
    this.expiryTimers.clear();
    this.emitChange();
  };

  dispose = () => {
    this.expiryTimers.forEach((timer) => clearTimeout(timer));
    this.expiryTimers.clear();
    this.entries = [];
    this.listeners.clear();
  };

  private emitChange() {
    this.listeners.forEach((listener) => listener());
  }

  private clearTimer(id: number) {
    const timer = this.expiryTimers.get(id);
    if (!timer) return;
    clearTimeout(timer);
    this.expiryTimers.delete(id);
  }
}
