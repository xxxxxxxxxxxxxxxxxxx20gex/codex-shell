import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Archive, ArchiveRestore, Copy, FilePenLine, Pin, RefreshCw, Trash2 } from "lucide-react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { writeClipboardText } from "./clipboard";
import {
  SessionActionConfirmDialog,
  type SessionDestructiveAction,
} from "./SessionActionConfirmDialog";
import {
  threadReference,
  threadReferenceKind,
  threadTitle,
  orderThreadsByBranch,
  threadBranchDepth,
} from "./threadPresentation";

interface Props {
  threads: Thread[];
  archived: boolean;
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
  onUnarchive: (threadId: string) => void;
  onDelete: (threadId: string) => void;
  onRefresh: () => void;
  onShowArchived: (archived: boolean) => void;
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

export function ThreadHistoryList(props: Props) {
  const orderedThreads = useMemo(() => orderThreadsByBranch(props.threads), [props.threads]);
  const [copyFeedback, setCopyFeedback] = useState<{ threadId: string; label: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    action: SessionDestructiveAction;
    thread: Thread;
  } | null>(null);

  useEffect(() => {
    if (!copyFeedback) return;
    const timeout = window.setTimeout(() => setCopyFeedback(null), 1_800);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  function rename(thread: Thread) {
    const name = window.prompt("重命名会话", threadTitle(thread));
    if (name?.trim() && name.trim() !== threadTitle(thread)) props.onRename(thread.id, name);
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    const { action, thread } = pendingAction;
    setPendingAction(null);
    if (action === "archive") props.onArchive(thread.id);
    else props.onDelete(thread.id);
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
        <button className="history-view-toggle" onClick={() => props.onShowArchived(!props.archived)}>{props.archived ? "已归档" : "本地历史"}<svg className="chevron-icon" aria-hidden="true" viewBox="0 0 12 12"><path d="m3.5 4.5 2.5 2.5 2.5-2.5" /></svg></button>
        <button type="button" onClick={props.onRefresh} disabled={props.loading} aria-label="刷新本地历史" title="刷新本地历史"><RefreshCw aria-hidden="true" className={props.loading ? "is-spinning" : undefined} /></button>
      </div>
      <nav className="thread-list" aria-label="本地历史会话">
        {props.error && <p className="sidebar-error">{props.error}</p>}
        {!props.error && !props.loading && props.threads.length === 0 && (
          <p className="sidebar-empty">{props.archived ? "当前没有已归档 Session。" : "本机还没有 Codex Shell 历史会话。"}</p>
        )}
        {orderedThreads.map((thread) => {
          const busy = props.disabled || props.actionThreadId === thread.id;
          const running = props.runningThreadIds.has(thread.id);
          const referenceKind = threadReferenceKind(thread);
          const copyLabel = copyFeedback?.threadId === thread.id
            ? copyFeedback.label
            : `复制 Session ${referenceKind}`;
          return (
            <div className={`thread-row ${thread.id === props.activeThreadId ? "active" : ""} ${running ? "running" : ""} ${thread.forkedFromId ? "branched" : ""}`} style={{ "--thread-depth": threadBranchDepth(thread, props.threads) } as CSSProperties} key={thread.id}>
              <button
                className="thread-main"
                disabled={busy || props.archived}
                onClick={() => props.onOpen(thread.id)}
                title={props.archived
                  ? `${threadTitle(thread)}\n恢复 Session 后可打开`
                  : `${threadTitle(thread)}\n${thread.cwd}`}
              >
                <span className="thread-title">{thread.isPinned && <Pin aria-hidden="true" className="thread-pin" fill="currentColor" />}{threadTitle(thread)}</span>
                <small>{running ? "运行中" : dateFormatter.format(new Date(thread.updatedAt * 1000))}</small>
              </button>
              <div className="thread-actions">
                <ThreadActionButton onClick={() => void copyReference(thread)} label={copyLabel}><Copy aria-hidden="true" /></ThreadActionButton>
                {props.archived ? (
                  <ThreadActionButton disabled={busy} onClick={() => props.onUnarchive(thread.id)} label="恢复 Session"><ArchiveRestore aria-hidden="true" /></ThreadActionButton>
                ) : <>
                  <ThreadActionButton disabled={busy} onClick={() => props.onTogglePin(thread)} label={thread.isPinned ? "取消固定" : "固定"}><Pin aria-hidden="true" fill={thread.isPinned ? "currentColor" : "none"} /></ThreadActionButton>
                  <ThreadActionButton disabled={busy} onClick={() => rename(thread)} label="重命名"><FilePenLine aria-hidden="true" /></ThreadActionButton>
                  <ThreadActionButton disabled={busy || running} onClick={() => setPendingAction({ action: "archive", thread })} label={running ? "运行中无法归档" : "归档"}><Archive aria-hidden="true" /></ThreadActionButton>
                </>}
                <ThreadActionButton disabled={busy || running} onClick={() => setPendingAction({ action: "delete", thread })} label={running ? "运行中无法删除" : "永久删除"}><Trash2 aria-hidden="true" /></ThreadActionButton>
              </div>
            </div>
          );
        })}
        {props.hasMore && <button className="load-more" disabled={props.loading} onClick={props.onLoadMore}>{props.loading ? "加载中…" : "加载更多"}</button>}
      </nav>
      {pendingAction && (
        <SessionActionConfirmDialog
          action={pendingAction.action}
          thread={pendingAction.thread}
          onCancel={() => setPendingAction(null)}
          onConfirm={confirmPendingAction}
        />
      )}
    </>
  );
}
