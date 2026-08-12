// @vitest-environment happy-dom

import { forwardRef, useImperativeHandle } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";

const virtuoso = vi.hoisted(() => ({
  scrollToIndex: vi.fn(),
  atBottomStateChange: null as ((atBottom: boolean) => void) | null,
  rangeChanged: null as ((range: { startIndex: number; endIndex: number }) => void) | null,
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: forwardRef((props: {
    data: Turn[];
    itemContent: (index: number, turn: Turn) => React.ReactNode;
    atBottomStateChange: (atBottom: boolean) => void;
    rangeChanged: (range: { startIndex: number; endIndex: number }) => void;
  }, ref) => {
    virtuoso.atBottomStateChange = props.atBottomStateChange;
    virtuoso.rangeChanged = props.rangeChanged;
    useImperativeHandle(ref, () => ({ scrollToIndex: virtuoso.scrollToIndex }));
    return <div data-testid="virtual-list">{props.data.map((turn, index) => props.itemContent(index, turn))}</div>;
  }),
}));

import { ConversationTimeline } from "./ConversationTimeline";

function turn(id: string, text: string): Turn {
  const message: ThreadItem = {
    type: "userMessage",
    id: `message-${id}`,
    clientId: null,
    content: [{ type: "text", text, text_elements: [] }],
  };
  return {
    id,
    items: [message],
    itemsView: "full",
    status: "completed",
    error: null,
    startedAt: null,
    completedAt: null,
    durationMs: null,
  };
}

describe("ConversationTimeline navigation", () => {
  afterEach(cleanup);

  beforeEach(() => {
    virtuoso.scrollToIndex.mockReset();
    virtuoso.atBottomStateChange = null;
    virtuoso.rangeChanged = null;
  });

  it("navigates directly between user turns", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);

    fireEvent.click(screen.getByRole("button", { name: "跳到消息：第一问" }));

    expect(virtuoso.scrollToIndex).toHaveBeenCalledWith({ index: 0, align: "start", behavior: "smooth" });
  });

  it("marks the visible message on the Codex-style rail", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);

    act(() => virtuoso.rangeChanged?.({ startIndex: 0, endIndex: 0 }));

    expect(screen.getByRole("button", { name: "跳到消息：第一问" }).className).toBe("active");
    expect(screen.getByRole("button", { name: "跳到消息：第二问" }).className).toBe("");
  });

  it("does not pull the reader away from history and surfaces new activity", () => {
    const initialTurns = [turn("1", "第一问"), turn("2", "第二问")];
    const view = render(<ConversationTimeline turns={initialTurns} running={false} />);

    act(() => virtuoso.atBottomStateChange?.(false));
    expect(screen.getByRole("button", { name: "返回最新" })).toBeTruthy();

    view.rerender(<ConversationTimeline turns={[...initialTurns, turn("3", "第三问")]} running />);
    fireEvent.click(screen.getByRole("button", { name: "有新内容 · 返回最新" }));

    expect(virtuoso.scrollToIndex).toHaveBeenLastCalledWith({ index: 2, align: "start", behavior: "smooth" });
  });
});
