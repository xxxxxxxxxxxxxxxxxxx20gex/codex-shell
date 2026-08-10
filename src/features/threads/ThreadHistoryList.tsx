import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { writeClipboardText } from "./clipboard";
import {
  buildThreadNumbers,
  formatThreadNumber,
  threadReference,
  threadReferenceKind,
  threadTitle,
} from "./threadPresentation";

interface Props {
  threads: Thread[];
  activeThreadId: string | null;
  loading: boolean;
  error: string;
  disabled: boolean;
  actionThreadId: string | null;
  runningThreadIds: ReadonlySet<string>;
  hasMore: boolean;
  onOpen: (threadId: string) => void;
  onRename: (threadId: string, name: string) => void;
  onTogglePin: (thread: Thread) => void;
  onArchive: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

interface ThreadActionButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ThreadActionButton({ label, disabled = false, onClick, children }: ThreadActionButtonProps) {
  return (
    <button
      type="button"
      className="thread-action-button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      data-tooltip={label}
    >
      {children}
    </button>
  );
}

function PinIcon({ pinned }: { pinned: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 16 16"><path className={pinned ? "filled" : ""} d="m5 2 6 0-.7 4 2.2 2.2v1.1H8.7V14H7.3V9.3H3.5V8.2L5.7 6 5 2Z" /></svg>;
}

function CopyIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16"><rect x="5.5" y="5.5" width="7" height="7" rx="1" /><path d="M10.5 5.5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h1.5" /></svg>;
}

function RenameIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3 11.8.4-2.5L10 2.7a1.4 1.4 0 0 1 2 0l1.3 1.3a1.4 1.4 0 0 1 0 2l-6.6 6.6-2.5.4L3 11.8Z" /><path d="m9.2 3.5 3.3 3.3" /></svg>;
}

function ArchiveIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3 5.5h10V13H3z" /><path d="M2.5 3h11v2.5h-11zM6 8h4" /></svg>;
}

function DeleteIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16"><path d="M3.5 4.5h9M6 4.5V3h4v1.5M5 6.5l.5 6.5h5l.5-6.5M7 7v4M9 7v4" /></svg>;
}

export function ThreadHistoryList(props: Props) {
  const threadNumbers = useMemo(() => buildThreadNumbers(props.threads), [props.threads]);
  const [copyFeedback, setCopyFeedback] = useState<{ threadId: string; label: string } | null>(null);

  useEffect(() => {
    if (!copyFeedback) return;
    const timeout = window.setTimeout(() => setCopyFeedback(null), 1_800);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  function rename(thread: Thread) {
    const name = window.prompt("重命名会话", threadTitle(thread));
    if (name?.trim() && name.trim() !== threadTitle(thread)) props.onRename(thread.id, name);
  }

  function remove(thread: Thread) {
    if (window.confirm(`永久删除“${threadTitle(thread)}”？此操作无法撤销。`)) props.onDelete(thread.id);
  }

  async function copyReference(thread: Thread) {
    const kind = threadReferenceKind(thread);
    try {
      await writeClipboardText(threadReference(thread));
      setCopyFeedback({ threadId: thread.id, label: `已复制 Session ${kind}` });
    } catch {
      setCopyFeedback({ threadId: thread.id, label: "复制失败" });
    }
  }

  return (
    <>
      <div className="section-heading">
        <span>本地历史</span>
        <button onClick={props.onRefresh} disabled={props.loading} aria-label="刷新本地历史">
          {props.loading ? "…" : "↻"}
        </button>
      </div>
      <nav className="thread-list" aria-label="本地历史会话">
        {props.error && <p className="sidebar-error">{props.error}</p>}
        {!props.error && !props.loading && props.threads.length === 0 && (
          <p className="sidebar-empty">本机还没有 Codex Shell 历史会话。</p>
        )}
        {props.threads.map((thread) => {
          const busy = props.disabled || props.actionThreadId === thread.id;
          const running = props.runningThreadIds.has(thread.id);
          const number = threadNumbers.get(thread.id);
          const referenceKind = threadReferenceKind(thread);
          const copyLabel = copyFeedback?.threadId === thread.id
            ? copyFeedback.label
            : `复制 Session ${referenceKind}`;
          return (
            <div className={`thread-row ${thread.id === props.activeThreadId ? "active" : ""} ${running ? "running" : ""}`} key={thread.id}>
              <button
                className="thread-main"
                disabled={busy}
                onClick={() => props.onOpen(thread.id)}
                title={`${threadTitle(thread)}\n${thread.cwd}`}
              >
                <span><b className="thread-number">{number ? formatThreadNumber(number) : "#--"}</b>{thread.isPinned && <i>◆</i>}{threadTitle(thread)}</span>
                <small>{running ? "运行中" : dateFormatter.format(new Date(thread.updatedAt * 1000))}</small>
              </button>
              <div className="thread-actions">
                <ThreadActionButton disabled={busy} onClick={() => props.onTogglePin(thread)} label={thread.isPinned ? "取消固定" : "固定"}><PinIcon pinned={thread.isPinned} /></ThreadActionButton>
                <ThreadActionButton onClick={() => void copyReference(thread)} label={copyLabel}><CopyIcon /></ThreadActionButton>
                <ThreadActionButton disabled={busy} onClick={() => rename(thread)} label="重命名"><RenameIcon /></ThreadActionButton>
                <ThreadActionButton disabled={busy || running} onClick={() => props.onArchive(thread.id)} label={running ? "运行中无法归档" : "归档"}><ArchiveIcon /></ThreadActionButton>
                <ThreadActionButton disabled={busy || running} onClick={() => remove(thread)} label={running ? "运行中无法删除" : "永久删除"}><DeleteIcon /></ThreadActionButton>
              </div>
            </div>
          );
        })}
        {props.hasMore && <button className="load-more" disabled={props.loading} onClick={props.onLoadMore}>{props.loading ? "加载中…" : "加载更多"}</button>}
      </nav>
    </>
  );
}
