// @vitest-environment happy-dom

import { forwardRef, useImperativeHandle } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";

const virtuoso = vi.hoisted(() => ({
  scrollToIndex: vi.fn(),
  atBottomStateChange: null as ((atBottom: boolean) => void) | null,
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: forwardRef((props: {
    data: Turn[];
    itemContent: (index: number, turn: Turn) => React.ReactNode;
    atBottomStateChange: (atBottom: boolean) => void;
  }, ref) => {
    virtuoso.atBottomStateChange = props.atBottomStateChange;
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
  beforeEach(() => {
    virtuoso.scrollToIndex.mockReset();
    virtuoso.atBottomStateChange = null;
  });

  it("navigates directly between user turns", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} modelId="gpt-test" />);

    fireEvent.click(screen.getByRole("button", { name: "跳到用户消息 1：第一问" }));

    expect(virtuoso.scrollToIndex).toHaveBeenCalledWith({ index: 0, align: "start", behavior: "smooth" });
  });

  it("does not pull the reader away from history and surfaces new activity", () => {
    const initialTurns = [turn("1", "第一问"), turn("2", "第二问")];
    const view = render(<ConversationTimeline turns={initialTurns} running={false} modelId="gpt-test" />);

    act(() => virtuoso.atBottomStateChange?.(false));
    expect(screen.getByRole("button", { name: "返回最新" })).toBeTruthy();

    view.rerender(<ConversationTimeline turns={[...initialTurns, turn("3", "第三问")]} running modelId="gpt-test" />);
    fireEvent.click(screen.getByRole("button", { name: "有新内容 · 返回最新" }));

    expect(virtuoso.scrollToIndex).toHaveBeenLastCalledWith({ index: 2, align: "start", behavior: "smooth" });
  });
});
