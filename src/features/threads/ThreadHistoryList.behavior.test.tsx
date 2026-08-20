// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { ThreadHistoryList } from "./ThreadHistoryList";

afterEach(cleanup);

function thread(id: string): Thread {
  return {
    id,
    name: id,
    preview: id,
    path: null,
    section: null,
    sectionEnteredAt: null,
    updatedAt: 1,
    cwd: "C:\\work",
  } as Thread;
}

function props(overrides: Partial<ComponentProps<typeof ThreadHistoryList>> = {}) {
  return {
    threads: [thread("thread-1")],
    archived: false,
    activeThreadId: null,
    loading: false,
    error: "",
    disabled: false,
    actionThreadId: null,
    runningThreadIds: new Set<string>(),
    hasMore: false,
    onOpen: vi.fn(),
    onRename: vi.fn(),
    onTogglePin: vi.fn(),
    onArchive: vi.fn(),
    onUnarchive: vi.fn(),
    onDelete: vi.fn(),
    onShowArchived: vi.fn(),
    onLoadMore: vi.fn(),
    ...overrides,
  };
}

describe("ThreadHistoryList behavior", () => {
  it("switches to archived history without exposing fork actions in history", () => {
    const values = props();
    render(<ThreadHistoryList {...values} />);

    fireEvent.click(screen.getByRole("button", { name: /^本地历史/ }));

    expect(values.onShowArchived).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: /^本地历史/ }).querySelector(".chevron-icon")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^本地历史/ }).textContent).not.toContain("⌄");
    expect(screen.queryByRole("button", { name: "分叉 Session" })).toBeNull();
  });

  it("disables Fork while running and restores from the archived view", () => {
    const onUnarchive = vi.fn();
    const onOpen = vi.fn();
    const { rerender } = render(<ThreadHistoryList {...props({
      runningThreadIds: new Set(["thread-1"]),
    })} />);
    rerender(<ThreadHistoryList {...props({ archived: true, onOpen, onUnarchive })} />);
    expect(screen.getByRole("button", { name: /thread-1/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "恢复 Session" }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(onUnarchive).toHaveBeenCalledWith("thread-1");
  });
});
