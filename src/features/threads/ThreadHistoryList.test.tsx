import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { ThreadHistoryList } from "./ThreadHistoryList";

function thread(id: string, path: string | null) {
  return {
    id,
    name: `Session ${id}`,
    preview: "",
    path,
    isPinned: false,
    updatedAt: 1_786_334_400,
    cwd: "C:\\workspace",
  } as Thread;
}

describe("ThreadHistoryList", () => {
  it("renders display-only numbers and accessible action descriptions", () => {
    const markup = renderToStaticMarkup(
      <ThreadHistoryList
        threads={[thread("real-thread-a", "C:\\sessions\\a.jsonl"), thread("real-thread-b", null)]}
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
        onDelete={vi.fn()}
        onRefresh={vi.fn()}
        onLoadMore={vi.fn()}
      />,
    );

    expect(markup).toContain("#01");
    expect(markup).toContain("#02");
    expect(markup).toContain('aria-label="复制 Session 路径"');
    expect(markup).toContain('aria-label="复制 Session ID"');
    expect(markup).toContain('class="thread-action-button"');
    expect(markup).toContain("real-thread-b");
  });
});
