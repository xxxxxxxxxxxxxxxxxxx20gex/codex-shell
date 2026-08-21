// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";
import { ConversationTimeline } from "./ConversationTimeline";

function turn(id: string, text: string, answered = false): Turn {
  const message: ThreadItem = {
    type: "userMessage",
    id: `message-${id}`,
    clientId: null,
    content: [{ type: "text", text, text_elements: [] }],
  };
  const items: ThreadItem[] = [message];
  if (answered) items.push({ type: "agentMessage", id: `answer-${id}`, text: `回答 ${text}`, phase: null, memoryCitation: null });
  return { id, items, itemsView: "full", status: "completed", error: null, startedAt: null, completedAt: null, durationMs: null };
}

function sizeScroller() {
  const scroller = screen.getByTestId("timeline-scroller");
  Object.defineProperties(scroller, {
    clientHeight: { configurable: true, value: 400 },
    scrollHeight: { configurable: true, value: 1000 },
    scrollTop: { configurable: true, writable: true, value: 600 },
  });
  act(() => vi.advanceTimersByTime(20));
  return scroller;
}

describe("ConversationTimeline native scroll controller", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it("uses one native scroll container and starts at the bottom", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);
    const scroller = sizeScroller();

    expect(scroller.className).toBe("timeline");
    expect(scroller.scrollTop).toBe(600);
    expect(screen.queryByRole("button", { name: "返回最新" })).toBeNull();
  });

  it("navigates directly between user turns without smooth-scroll retries", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);
    const scroller = sizeScroller();
    const first = scroller.querySelector<HTMLElement>('[data-turn-index="0"]');
    const second = scroller.querySelector<HTMLElement>('[data-turn-index="1"]');
    Object.defineProperty(first, "offsetTop", { configurable: true, value: 0 });
    Object.defineProperty(second, "offsetTop", { configurable: true, value: 500 });

    fireEvent.click(screen.getByRole("button", { name: "跳到消息：第一问" }));

    expect(scroller.scrollTop).toBe(0);
    expect(screen.getByRole("button", { name: "返回最新" })).toBeTruthy();
  });

  it("returns to the latest message with an immediate bottom assignment", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);
    const scroller = sizeScroller();
    scroller.scrollTop = 240;
    fireEvent.scroll(scroller);
    expect(screen.getByRole("button", { name: "返回最新" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "返回最新" }));

    expect(scroller.scrollTop).toBe(600);
    expect(screen.queryByRole("button", { name: "返回最新" })).toBeNull();
  });

  it("does not reassert the bottom position for completed history", () => {
    const view = render(<ConversationTimeline turns={[turn("1", "第一问", true)]} running={false} />);
    const scroller = sizeScroller();
    scroller.scrollTop = 220;
    fireEvent.scroll(scroller);

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问（已完成）", true)]} running={false} />);

    expect(scroller.scrollTop).toBe(220);
  });

  it("resets the scroll policy when switching sessions", () => {
    const view = render(<ConversationTimeline turns={[turn("old", "旧会话", true)]} threadId="old-thread" running={false} />);
    const scroller = sizeScroller();
    scroller.scrollTop = 120;
    fireEvent.scroll(scroller);

    view.rerender(<ConversationTimeline turns={[turn("new", "新会话", true), turn("new-2", "新会话第二问", true)]} threadId="new-thread" running={false} />);

    expect(scroller.scrollTop).toBe(600);
    expect(screen.queryByRole("button", { name: "返回最新" })).toBeNull();
  });

  it("keeps following a running Turn only when the reader has not scrolled away", () => {
    const view = render(<ConversationTimeline turns={[turn("1", "第一问")]} running />);
    const scroller = sizeScroller();

    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，回答继续增长")]} running />);
    expect(scroller.scrollTop).toBe(600);

    scroller.scrollTop = 240;
    fireEvent.scroll(scroller);
    expect(screen.getByRole("button", { name: "返回最新" })).toBeTruthy();
    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，用户正在阅读历史")]} running />);

    expect(scroller.scrollTop).toBe(240);
  });

  it("does not jump while repeated completed-history scroll events are settling", () => {
    const view = render(<ConversationTimeline turns={[turn("1", "第一问", true), turn("2", "第二问", true)]} running={false} />);
    const scroller = sizeScroller();
    for (const top of [520, 420, 320, 220]) {
      scroller.scrollTop = top;
      fireEvent.scroll(scroller);
      view.rerender(<ConversationTimeline turns={[turn("1", "第一问", true), turn("2", "第二问", true)]} running={false} />);
      expect(scroller.scrollTop).toBe(top);
    }
  });

  it("shows new activity without taking the reader away from history", () => {
    const initialTurns = [turn("1", "第一问", true), turn("2", "第二问", true)];
    const view = render(<ConversationTimeline turns={initialTurns} running={false} />);
    const scroller = sizeScroller();
    scroller.scrollTop = 200;
    fireEvent.scroll(scroller);

    view.rerender(<ConversationTimeline turns={[...initialTurns, turn("3", "第三问")]} running />);

    expect(screen.getByRole("button", { name: "有新内容 · 返回最新" })).toBeTruthy();
    expect(scroller.scrollTop).toBe(200);
  });

  it("resumes following only after a manual scroll reaches bottom and settles", () => {
    const view = render(<ConversationTimeline turns={[turn("1", "第一问")]} running />);
    const scroller = sizeScroller();
    scroller.scrollTop = 200;
    fireEvent.scroll(scroller);
    scroller.scrollTop = 600;
    fireEvent.scroll(scroller);
    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，仍在底部")]} running />);
    expect(scroller.scrollTop).toBe(600);

    act(() => vi.advanceTimersByTime(320));
    view.rerender(<ConversationTimeline turns={[turn("1", "第一问，底部继续增长")]} running />);
    expect(scroller.scrollTop).toBe(600);
  });

  it("keeps the message rail synchronized with the visible turn", () => {
    render(<ConversationTimeline turns={[turn("1", "第一问"), turn("2", "第二问")]} running={false} />);
    const scroller = sizeScroller();
    const first = scroller.querySelector<HTMLElement>('[data-turn-index="0"]');
    const second = scroller.querySelector<HTMLElement>('[data-turn-index="1"]');
    Object.defineProperty(first, "offsetTop", { configurable: true, value: 0 });
    Object.defineProperty(second, "offsetTop", { configurable: true, value: 500 });
    scroller.scrollTop = 500;
    fireEvent.scroll(scroller);

    expect(screen.getByRole("button", { name: "跳到消息：第二问" }).className).toBe("active");
  });
});
