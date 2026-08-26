import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Copy,
  FilePenLine,
  Pin,
  Trash2,
} from "lucide-react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { writeClipboardText } from "./clipboard";
import { SessionActionConfirmDialog } from "./SessionActionConfirmDialog";
import {
  isThreadPinned,
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
  const [openActionThreadId, setOpenActionThreadId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Thread | null>(null);

  useEffect(() => {
    if (!copyFeedback) return;
    const timeout = window.setTimeout(() => setCopyFeedback(null), 1_800);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  useEffect(() => {
    if (!openActionThreadId) return;
    const close = () => setOpenActionThreadId(null);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [openActionThreadId]);

  function rename(thread: Thread) {
    const name = window.prompt("重命名会话", threadTitle(thread));
    if (name?.trim() && name.trim() !== threadTitle(thread)) props.onRename(thread.id, name);
  }

  function confirmPendingDelete() {
    if (!pendingDelete) return;
    setPendingDelete(null);
    props.onDelete(pendingDelete.id);
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
        <button className="history-view-toggle" onClick={() => props.onShowArchived(!props.archived)}>{props.archived ? "已归档" : "本地历史"}<ChevronDown aria-hidden="true" className="chevron-icon" /></button>
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
            <div className={`thread-row ${thread.id === props.activeThreadId ? "active" : ""} ${running ? "running" : ""} ${thread.forkedFromId ? "branched" : ""}`} style={{ "--thread-depth": threadBranchDepth(thread, props.threads) } as CSSProperties} key={thread.id} onContextMenu={(event) => { event.preventDefault(); setOpenActionThreadId(thread.id); }}>
              <button
                className="thread-main"
                disabled={busy || props.archived}
                onClick={() => props.onOpen(thread.id)}
                title={props.archived
                  ? `${threadTitle(thread)}\n恢复 Session 后可打开`
                  : `${threadTitle(thread)}\n${thread.cwd}`}
              >
                <span className="thread-copy">
                  <span className="thread-title">{isThreadPinned(thread) && <Pin className="thread-pin-indicator" aria-hidden="true" fill="currentColor" />}{threadTitle(thread)}</span>
                  <small>{running ? "运行中" : dateFormatter.format(new Date(thread.updatedAt * 1000))}</small>
                </span>
              </button>
              <div className={`thread-actions ${openActionThreadId === thread.id ? "menu-open" : ""}`} onPointerDown={(event) => event.stopPropagation()}>
                {!props.archived && <>
                  <ThreadActionButton disabled={busy} onClick={() => props.onTogglePin(thread)} label={isThreadPinned(thread) ? "取消置顶" : "置顶"}><Pin aria-hidden="true" fill={isThreadPinned(thread) ? "currentColor" : "none"} /></ThreadActionButton>
                  <ThreadActionButton disabled={busy || running} onClick={() => props.onArchive(thread.id)} label={running ? "运行中无法归档" : "归档"}><Archive aria-hidden="true" /></ThreadActionButton>
                </>}
                <div className={`thread-action-menu ${openActionThreadId === thread.id ? "open" : ""}`} role="menu">
                  <ThreadActionButton onClick={() => { setOpenActionThreadId(null); void copyReference(thread); }} label={copyLabel}><Copy aria-hidden="true" /><b className="thread-action-label">复制 {referenceKind === "路径" ? "Session 路径" : "Session ID"}</b></ThreadActionButton>
                  {props.archived ? (
                    <ThreadActionButton disabled={busy} onClick={() => { setOpenActionThreadId(null); props.onUnarchive(thread.id); }} label="恢复 Session"><ArchiveRestore aria-hidden="true" /><b className="thread-action-label">恢复 Session</b></ThreadActionButton>
                  ) : <>
                    <ThreadActionButton disabled={busy} onClick={() => { setOpenActionThreadId(null); rename(thread); }} label="重命名"><FilePenLine aria-hidden="true" /><b className="thread-action-label">重命名</b></ThreadActionButton>
                  </>}
                  <ThreadActionButton disabled={busy || running} onClick={() => { setOpenActionThreadId(null); setPendingDelete(thread); }} label={running ? "运行中无法删除" : "永久删除"}><Trash2 aria-hidden="true" /><b className="thread-action-label">永久删除</b></ThreadActionButton>
                </div>
              </div>
            </div>
          );
        })}
        {props.hasMore && <button className="load-more" disabled={props.loading} onClick={props.onLoadMore}>{props.loading ? "加载中…" : "加载更多"}</button>}
      </nav>
      {pendingDelete && (
        <SessionActionConfirmDialog
          thread={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmPendingDelete}
        />
      )}
    </>
  );
}
