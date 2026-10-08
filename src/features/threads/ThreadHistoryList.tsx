import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
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
import { CompactIconButton } from "../../shared/CompactIconButton";
import { ContextMenu, type ContextMenuAction } from "../../shared/ContextMenu";
import { writeClipboardText } from "./clipboard";
import { SessionActionConfirmDialog } from "./SessionActionConfirmDialog";
import {
  isThreadPinned,
  threadReference,
  threadReferenceKind,
  threadTitle,
  threadFullTitle,
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

interface ThreadMenuState {
  threadId: string;
  x: number;
  y: number;
  anchor: HTMLElement;
}

export function ThreadHistoryList(props: Props) {
  const orderedThreads = useMemo(() => orderThreadsByBranch(props.threads), [props.threads]);
  const [copyFeedback, setCopyFeedback] = useState<{ threadId: string; label: string } | null>(null);
  const [menu, setMenu] = useState<ThreadMenuState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Thread | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!copyFeedback) return;
    const timeout = window.setTimeout(() => setCopyFeedback(null), 1_800);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  function rename(thread: Thread) {
    const name = window.prompt("重命名会话", threadFullTitle(thread));
    if (name?.trim() && name.trim() !== threadFullTitle(thread)) props.onRename(thread.id, name);
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

  function openMenu(event: MouseEvent<HTMLDivElement>, threadId: string) {
    event.preventDefault();
    const row = event.currentTarget;
    // The ContextMenu key and Shift+F10 can report 0,0; anchor those menus to the row instead.
    const bounds = row.getBoundingClientRect();
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    const focused = document.activeElement instanceof HTMLElement && row.contains(document.activeElement) ? document.activeElement : null;
    setMenu({
      threadId,
      x: fromKeyboard ? bounds.right - 8 : event.clientX,
      y: fromKeyboard ? bounds.bottom - 4 : event.clientY,
      anchor: focused ?? row.querySelector<HTMLElement>("button:not(:disabled)") ?? row,
    });
  }

  function menuActions(thread: Thread): ContextMenuAction[] {
    const busy = props.disabled || props.actionThreadId === thread.id;
    const running = props.runningThreadIds.has(thread.id);
    return [
      { label: threadReferenceKind(thread) === "路径" ? "复制 Session 路径" : "复制 Session ID", icon: <Copy aria-hidden="true" />, run: () => copyReference(thread) },
      props.archived
        ? { label: "恢复 Session", icon: <ArchiveRestore aria-hidden="true" />, disabled: busy, run: () => props.onUnarchive(thread.id) }
        : { label: "重命名", icon: <FilePenLine aria-hidden="true" />, disabled: busy, run: () => rename(thread) },
      { label: "永久删除", icon: <Trash2 aria-hidden="true" />, disabled: busy || running, run: () => setPendingDelete(thread) },
    ];
  }

  const menuThread = menu ? props.threads.find((thread) => thread.id === menu.threadId) : undefined;

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
          const menuOpen = menu?.threadId === thread.id;
          const feedback = copyFeedback?.threadId === thread.id ? copyFeedback.label : null;
          return (
            <div className={`thread-row ${thread.id === props.activeThreadId ? "active" : ""} ${running ? "running" : ""} ${thread.forkedFromId ? "branched" : ""} ${menuOpen ? "action-open" : ""}`} style={{ "--thread-depth": threadBranchDepth(thread, props.threads) } as CSSProperties} key={thread.id} onContextMenu={(event) => openMenu(event, thread.id)}>
              <button
                className="thread-main"
                disabled={busy || props.archived}
                onClick={() => props.onOpen(thread.id)}
                title={props.archived
                  ? `${threadFullTitle(thread)}\n恢复 Session 后可打开`
                  : `${threadFullTitle(thread)}\n${thread.cwd}`}
              >
                <span className="thread-copy">
                  <span className="thread-title">{isThreadPinned(thread) && <Pin className="thread-pin-indicator" aria-hidden="true" fill="currentColor" />}{threadTitle(thread)}</span>
                  <small className={feedback ? "thread-feedback" : undefined}>{feedback ?? (running ? "运行中" : dateFormatter.format(new Date(thread.updatedAt * 1000)))}</small>
                </span>
              </button>
              <div className={`thread-actions ${menuOpen ? "menu-open" : ""}`}>
                {props.archived ? (
                  <CompactIconButton className="thread-action-button" disabled={busy} onClick={() => props.onUnarchive(thread.id)} label="恢复 Session" icon={<ArchiveRestore aria-hidden="true" />} />
                ) : <>
                  <CompactIconButton className="thread-action-button" disabled={busy} onClick={() => props.onTogglePin(thread)} label={isThreadPinned(thread) ? "取消置顶" : "置顶"} icon={<Pin aria-hidden="true" fill={isThreadPinned(thread) ? "currentColor" : "none"} />} />
                  <CompactIconButton className="thread-action-button" disabled={busy || running} onClick={() => props.onArchive(thread.id)} label={running ? "运行中无法归档" : "归档"} icon={<Archive aria-hidden="true" />} />
                </>}
              </div>
            </div>
          );
        })}
        {props.hasMore && <button className="load-more" disabled={props.loading} onClick={props.onLoadMore}>{props.loading ? "加载中…" : "加载更多"}</button>}
      </nav>
      {menu && menuThread && <ContextMenu label="会话操作" x={menu.x} y={menu.y} anchor={menu.anchor} actions={menuActions(menuThread)} onClose={closeMenu} onError={() => setCopyFeedback({ threadId: menuThread.id, label: "操作失败" })} />}
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
