type RuntimeNoticeKind = "info" | "warning" | "security" | "deprecation";

export interface RuntimeNotice {
  id: number;
  kind: RuntimeNoticeKind;
  title: string;
  message: string;
  path?: string;
  receivedAt: number;
}

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

  getSnapshot = () => this.entries;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  push = (notice: Omit<RuntimeNotice, "id" | "receivedAt">) => {
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
    ));
    const entry = { ...boundedNotice, id: this.sequence++, receivedAt: Date.now() };
    const withoutDuplicate = duplicateIndex === -1
      ? this.entries
      : this.entries.filter((_, index) => index !== duplicateIndex);
    this.entries = [...withoutDuplicate, entry].slice(-MAX_RUNTIME_NOTICES);
    this.emitChange();
  };

  dismiss = (id: number) => {
    const next = this.entries.filter((entry) => entry.id !== id);
    if (next.length === this.entries.length) return;
    this.entries = next;
    this.emitChange();
  };

  clear = () => {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.emitChange();
  };

  dispose = () => {
    this.entries = [];
    this.listeners.clear();
  };

  private emitChange() {
    this.listeners.forEach((listener) => listener());
  }
}
