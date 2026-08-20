import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { SessionActionConfirmDialog } from "./SessionActionConfirmDialog";
import { ThreadHistoryList } from "./ThreadHistoryList";

function thread(id: string, path: string | null) {
  return {
    id,
    name: `Session ${id}`,
    preview: "",
    path,
    section: null,
    sectionEnteredAt: null,
    updatedAt: 1_786_334_400,
    cwd: "C:\\workspace",
  } as Thread;
}

describe("ThreadHistoryList", () => {
  it("renders stable session names and accessible action descriptions", () => {
    const markup = renderToStaticMarkup(
      <ThreadHistoryList
        threads={[thread("real-thread-a", "C:\\sessions\\a.jsonl"), thread("real-thread-b", null)]}
        archived={false}
        activeThreadId="real-thread-b"
        loading={false}
        error=""
        disabled={false}
        actionThreadId={null}
        runningThreadIds={new Set()}
        hasMore={false}
        onOpen={vi.fn()}
        onRename={vi.fn()}
        onTogglePin={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
        onShowArchived={vi.fn()}
        onLoadMore={vi.fn()}
      />,
    );

    expect(markup).not.toContain("#01");
    expect(markup).not.toContain("#02");
    expect(markup).toContain('aria-label="复制 Session 路径"');
    expect(markup).toContain('aria-label="复制 Session ID"');
    expect(markup).toContain('class="thread-action-button"');
    expect(markup).toContain('class="thread-title"');
    expect(markup).toContain("real-thread-b");
  });

  it("renders restore actions in the archived view", () => {
    const markup = renderToStaticMarkup(
      <ThreadHistoryList
        threads={[thread("archived-thread", null)]}
        archived
        activeThreadId={null}
        loading={false}
        error=""
        disabled={false}
        actionThreadId={null}
        runningThreadIds={new Set()}
        hasMore={false}
        onOpen={vi.fn()}
        onRename={vi.fn()}
        onTogglePin={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
        onShowArchived={vi.fn()}
        onLoadMore={vi.fn()}
      />,
    );

    expect(markup).toContain("已归档");
    expect(markup).toContain('aria-label="恢复 Session"');
  });

  it("renders permanent-delete confirmation", () => {
    const session = thread("real-thread-a", "C:\\sessions\\a.jsonl");
    const deleteMarkup = renderToStaticMarkup(
      <SessionActionConfirmDialog thread={session} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(deleteMarkup).toContain('role="alertdialog"');
    expect(deleteMarkup).toContain("永久删除这个会话？");
    expect(deleteMarkup).toContain("此操作无法撤销");
  });
});
