import type { Thread } from "../../generated/app-server/v2/Thread";

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

function threadTitle(thread: Thread) {
  return thread.name?.trim() || thread.preview.trim() || "未命名会话";
}

export function ThreadHistoryList(props: Props) {
  function rename(thread: Thread) {
    const name = window.prompt("重命名会话", threadTitle(thread));
    if (name?.trim() && name.trim() !== threadTitle(thread)) props.onRename(thread.id, name);
  }

  function remove(thread: Thread) {
    if (window.confirm(`永久删除“${threadTitle(thread)}”？此操作无法撤销。`)) props.onDelete(thread.id);
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
          return (
            <div className={`thread-row ${thread.id === props.activeThreadId ? "active" : ""} ${running ? "running" : ""}`} key={thread.id}>
              <button
                className="thread-main"
                disabled={busy}
                onClick={() => props.onOpen(thread.id)}
                title={`${threadTitle(thread)}\n${thread.cwd}`}
              >
                <span>{thread.isPinned && <i>◆</i>}{threadTitle(thread)}</span>
                <small>{running ? "运行中" : dateFormatter.format(new Date(thread.updatedAt * 1000))}</small>
              </button>
              <div className="thread-actions">
                <button disabled={busy} onClick={() => props.onTogglePin(thread)} title={thread.isPinned ? "取消固定" : "固定"}>{thread.isPinned ? "◇" : "◆"}</button>
                <button disabled={busy} onClick={() => rename(thread)} title="重命名">✎</button>
                <button disabled={busy || running} onClick={() => props.onArchive(thread.id)} title={running ? "运行中无法归档" : "归档"}>▣</button>
                <button disabled={busy || running} onClick={() => remove(thread)} title={running ? "运行中无法删除" : "永久删除"}>×</button>
              </div>
            </div>
          );
        })}
        {props.hasMore && <button className="load-more" disabled={props.loading} onClick={props.onLoadMore}>{props.loading ? "加载中…" : "加载更多"}</button>}
      </nav>
    </>
  );
}
