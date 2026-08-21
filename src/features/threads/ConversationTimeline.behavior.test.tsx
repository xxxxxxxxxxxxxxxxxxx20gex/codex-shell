// @vitest-environment happy-dom

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";

const virtuoso = vi.hoisted(() => ({
  scrollToIndex: vi.fn(),
  autoscrollToBottom: vi.fn(),
  atBottomStateChange: null as ((atBottom: boolean) => void) | null,
  rangeChanged: null as ((range: { startIndex: number; endIndex: number }) => void) | null,
  followOutput: null as ((atBottom: boolean) => "auto" | "smooth" | false) | null,
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: forwardRef((props: {
    data: Turn[];
    itemContent: (index: number, turn: Turn) => React.ReactNode;
    atBottomStateChange: (atBottom: boolean) => void;
    rangeChanged: (range: { startIndex: number; endIndex: number }) => void;
    followOutput: ((atBottom: boolean) => "auto" | "smooth" | false);
    scrollerRef: (ref: HTMLElement | Window | null) => void;
  }, ref) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const setScrollerRef = props.scrollerRef;
    virtuoso.atBottomStateChange = props.atBottomStateChange;
    virtuoso.rangeChanged = props.rangeChanged;
    virtuoso.followOutput = props.followOutput;
    useImperativeHandle(ref, () => ({
      scrollToIndex: virtuoso.scrollToIndex,
      autoscrollToBottom: virtuoso.autoscrollToBottom,
    }));
    useEffect(() => {
      setScrollerRef(scrollerRef.current);
      return () => setScrollerRef(null);
    }, [setScrollerRef]);
    return <div ref={scrollerRef} data-testid="virtual-list">{props.data.map((turn, index) => props.itemContent(index, turn))}</div>;
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

function answeredTurn(id: string, text: string): Turn {
  const base = turn(id, text);
  const answer: ThreadItem = {
    type: "agentMessage",
    id: `answer-${id}`,
    text: `回答 ${text}`,
    phase: null,
    memoryCitation: null,
  };
  return { ...base, items: [...base.items, answer] };
}

describe("ConversationTimeline navigation", () => {
  afterEach(cleanup);

  beforeEach(() => {
    virtuoso.scrollToIndex.mockReset();
    virtuoso.autoscrollToBottom.mockReset();
    virtuoso.atBottomStateChange = null;
    virtuoso.rangeChanged = null;
    virtuoso.followOutput = null;
  });

  it("navigates directly between user turns", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);

    fireEvent.click(screen.getByRole("button", { name: "跳到消息：第一问" }));

    expect(virtuoso.scrollToIndex).toHaveBeenCalledWith({ index: 0, align: "start", behavior: "smooth" });
  });

  it("forks through the selected historical Turn instead of the whole Session", () => {
    const onFork = vi.fn();
    render(
      <ConversationTimeline
        turns={[answeredTurn("turn-1", "第一问"), answeredTurn("turn-2", "第二问")]}
        running={false}
        threadId="thread-source"
        onFork={onFork}
      />,
    );

    const forkButtons = screen.getAllByRole("button", { name: "分叉 Session" });
    expect(forkButtons).toHaveLength(2);
    fireEvent.click(forkButtons[0]);
    fireEvent.click(forkButtons[1]);

    expect(onFork).toHaveBeenNthCalledWith(1, "thread-source", "turn-1");
    expect(onFork).toHaveBeenNthCalledWith(2, "thread-source", "turn-2");
  });

  it("keeps a completed historical Turn forkable while the latest Turn is running", () => {
    const onFork = vi.fn();
    render(
      <ConversationTimeline
        turns={[answeredTurn("turn-1", "第一问"), answeredTurn("turn-2", "第二问")]}
        running
        threadId="thread-source"
        onFork={onFork}
      />,
    );

    const forkButton = screen.getByRole("button", { name: "分叉 Session" });
    fireEvent.click(forkButton);

    expect(onFork).toHaveBeenCalledWith("thread-source", "turn-1");
  });

  it("disables every Turn fork action while another Session mutation is pending", () => {
    render(
      <ConversationTimeline
        turns={[answeredTurn("turn-1", "第一问"), answeredTurn("turn-2", "第二问")]}
        running={false}
        threadId="thread-source"
        forkDisabled
        onFork={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "分叉 Session" })).toBeNull();
  });

  it("marks the visible message on the Codex-style rail", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);

    act(() => {
      virtuoso.atBottomStateChange?.(false);
      virtuoso.rangeChanged?.({ startIndex: 0, endIndex: 0 });
    });

    expect(screen.getByRole("button", { name: "跳到消息：第一问" }).className).toBe("active");
    expect(screen.getByRole("button", { name: "跳到消息：第二问" }).className).toBe("");
  });

  it("marks the latest message when the reader reaches the bottom", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);

    act(() => {
      virtuoso.atBottomStateChange?.(false);
      virtuoso.rangeChanged?.({ startIndex: 0, endIndex: 1 });
    });
    expect(screen.getByRole("button", { name: "跳到消息：第一问" }).className).toBe("active");

    act(() => virtuoso.atBottomStateChange?.(true));

    expect(screen.getByRole("button", { name: "跳到消息：第一问" }).className).toBe("");
    expect(screen.getByRole("button", { name: "跳到消息：第二问" }).className).toBe("active");
  });

  it("does not pull the reader away from history and surfaces new activity", () => {
    const initialTurns = [turn("1", "第一问"), turn("2", "第二问")];
    const view = render(<ConversationTimeline turns={initialTurns} running={false} />);

    act(() => virtuoso.atBottomStateChange?.(false));
    expect(screen.getByRole("button", { name: "返回最新" })).toBeTruthy();

    view.rerender(<ConversationTimeline turns={[...initialTurns, turn("3", "第三问")]} running />);
    fireEvent.click(screen.getByRole("button", { name: "有新内容 · 返回最新" }));

    expect(virtuoso.scrollToIndex).toHaveBeenLastCalledWith({ index: "LAST", align: "end", behavior: "smooth" });
  });

  it("does not infer that a tall latest Turn is at the bottom after navigation", () => {
    const turns = [turn("1", "第一问"), turn("2", "第二问")];
    const view = render(<ConversationTimeline turns={turns} running={false} />);
    act(() => virtuoso.atBottomStateChange?.(false));

    fireEvent.click(screen.getByRole("button", { name: "跳到消息：第二问" }));
    view.rerender(<ConversationTimeline turns={turns} running />);

    expect(screen.getByRole("button", { name: "有新内容 · 返回最新" })).toBeTruthy();
    expect(virtuoso.scrollToIndex).toHaveBeenLastCalledWith({ index: 1, align: "start", behavior: "smooth" });
  });

  it("keeps following a streamed Turn after content growth temporarily moves the viewport off bottom", () => {
    const initialTurns = [turn("1", "第一问")];
    const view = render(<ConversationTimeline turns={initialTurns} running />);
    virtuoso.autoscrollToBottom.mockClear();

    act(() => virtuoso.atBottomStateChange?.(false));
    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);

    expect(virtuoso.autoscrollToBottom).toHaveBeenCalledTimes(1);
  });

  it("does not mistake a layout-driven scroll correction for reader navigation", () => {
    const initialTurns = [turn("1", "第一问")];
    const view = render(<ConversationTimeline turns={initialTurns} running />);
    const scroller = screen.getByTestId("virtual-list");
    Object.defineProperty(scroller, "scrollTop", { configurable: true, writable: true, value: 100 });
    fireEvent.scroll(scroller);
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    virtuoso.autoscrollToBottom.mockClear();

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);

    expect(virtuoso.autoscrollToBottom).toHaveBeenCalledTimes(1);
  });

  it("stops following streamed output after the reader scrolls upward", () => {
    const initialTurns = [turn("1", "第一问")];
    const view = render(<ConversationTimeline turns={initialTurns} running />);
    const scroller = screen.getByTestId("virtual-list");
    Object.defineProperty(scroller, "scrollTop", { configurable: true, writable: true, value: 100 });
    fireEvent.scroll(scroller);
    fireEvent.pointerDown(scroller);
    scroller.scrollTop = 40;
    fireEvent.scroll(scroller);
    fireEvent.pointerUp(window);
    virtuoso.autoscrollToBottom.mockClear();

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);

    expect(virtuoso.autoscrollToBottom).not.toHaveBeenCalled();
  });

  it("does not fight a scrollbar thumb while the reader drags downward", () => {
    const initialTurns = [turn("1", "第一问")];
    const view = render(<ConversationTimeline turns={initialTurns} running />);
    const scroller = screen.getByTestId("virtual-list");
    Object.defineProperty(scroller, "scrollTop", { configurable: true, writable: true, value: 40 });
    fireEvent.scroll(scroller);
    fireEvent.pointerDown(scroller);
    scroller.scrollTop = 100;
    fireEvent.scroll(scroller);
    virtuoso.autoscrollToBottom.mockClear();

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);

    expect(virtuoso.autoscrollToBottom).not.toHaveBeenCalled();
  });

  it("stops following when a native scrollbar emits a trusted scroll without pointer events", () => {
    const initialTurns = [turn("1", "第一问")];
    const view = render(<ConversationTimeline turns={initialTurns} running />);
    const scroller = screen.getByTestId("virtual-list");
    Object.defineProperty(scroller, "scrollTop", { configurable: true, writable: true, value: 100 });
    fireEvent.scroll(scroller);
    scroller.scrollTop = 40;
    const trustedScroll = new Event("scroll");
    Object.defineProperty(trustedScroll, "isTrusted", { configurable: true, value: true });
    scroller.dispatchEvent(trustedScroll);
    virtuoso.autoscrollToBottom.mockClear();

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);

    expect(virtuoso.followOutput?.(true)).toBe(false);
    expect(virtuoso.autoscrollToBottom).not.toHaveBeenCalled();
  });

  it("does not re-enable following when bottom is reported during an active drag", () => {
    const initialTurns = [turn("1", "第一问")];
    const view = render(<ConversationTimeline turns={initialTurns} running />);
    const scroller = screen.getByTestId("virtual-list");
    fireEvent.pointerDown(scroller);
    act(() => virtuoso.atBottomStateChange?.(true));
    virtuoso.autoscrollToBottom.mockClear();

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);

    expect(virtuoso.autoscrollToBottom).not.toHaveBeenCalled();
  });

  it("disables Virtuoso followOutput while the scrollbar is being dragged", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问")]} running />);
    const scroller = screen.getByTestId("virtual-list");
    expect(virtuoso.followOutput?.(true)).toBe("auto");

    fireEvent.pointerDown(scroller);

    expect(virtuoso.followOutput?.(true)).toBe(false);
    expect(virtuoso.followOutput?.(false)).toBe(false);
  });

  it.each(["mouseup", "blur"] as const)("restores bottom following when a native drag ends through %s", (eventName) => {
    render(<ConversationTimeline turns={[turn("1", "第一问")]} running />);
    const scroller = screen.getByTestId("virtual-list");
    fireEvent.pointerDown(scroller);
    expect(virtuoso.followOutput?.(true)).toBe(false);

    fireEvent(window, new Event(eventName));

    expect(virtuoso.followOutput?.(true)).toBe("auto");
  });

  it("keeps following when the reader only clicks message content", () => {
    const initialTurns = [turn("1", "第一问")];
    const view = render(<ConversationTimeline turns={initialTurns} running />);
    fireEvent.pointerDown(screen.getByText("第一问"));
    virtuoso.autoscrollToBottom.mockClear();

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);

    expect(virtuoso.autoscrollToBottom).toHaveBeenCalledTimes(1);
  });
});
