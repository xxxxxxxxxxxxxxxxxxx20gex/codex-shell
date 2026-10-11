// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SideChatPanel } from "./SideChatPanel";
import type { SideChat } from "./useSideChat";

afterEach(cleanup);

function fakeChat(overrides: Partial<SideChat> = {}) {
  return {
    open: true,
    thread: { id: "side-thread" },
    turns: [],
    running: false,
    submitting: false,
    error: "",
    tokenUsage: null,
    diffsByTurnId: {},
    plansByTurnId: {},
    activeItemTurnIds: {},
    mcpProgressByItemId: {},
    processEventsByTurnId: {},
    openChat: vi.fn(async () => true),
    close: vi.fn(async () => undefined),
    send: vi.fn(async () => true),
    interrupt: vi.fn(async () => undefined),
    reset: vi.fn(),
    subscriptionHandlers: {} as SideChat["subscriptionHandlers"],
    ...overrides,
  } as unknown as SideChat;
}

describe("SideChatPanel", () => {
  it("wires model questions to the side-chat answer handler", async () => {
    const answerQuestions = vi.fn(async () => true);
    const chat = fakeChat({ answerQuestions, turns: [{ id: "turn", itemsView: "full", status: "completed", error: null, startedAt: 1, completedAt: 2, durationMs: 1000, items: [{ type: "agentMessage", id: "question", text: "请选择", phase: "final_answer", memoryCitation: null, delivery: null, questions: [{ title: "方向", options: ["方案 A", "方案 B"] }] }] }] });
    render(<SideChatPanel chat={chat} maximized={false} onToggleMaximize={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "方案 A" }));
    fireEvent.click(screen.getByRole("button", { name: "发送回答" }));
    await waitFor(() => expect(answerQuestions).toHaveBeenCalledWith(expect.stringContaining("<send_user_message_question_reply>")));
  });
  it("does not send Enter used to confirm IME composition", async () => {
    const chat = fakeChat();
    render(<SideChatPanel chat={chat} maximized={false} onToggleMaximize={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "中文" } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", isComposing: true });
    expect(chat.send).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    await waitFor(() => expect(chat.send).toHaveBeenCalledWith("中文"));
  });
  it("submits text through the isolated side-chat session", async () => {
    const chat = fakeChat();
    render(<SideChatPanel chat={chat} maximized={false} onToggleMaximize={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "解释这个改动" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));
    await waitFor(() => expect(chat.send).toHaveBeenCalledWith("解释这个改动"));
  });

  it("exposes close and maximize controls without changing the composer", () => {
    const onClose = vi.fn();
    const onToggleMaximize = vi.fn();
    render(<SideChatPanel chat={fakeChat()} maximized={false} onToggleMaximize={onToggleMaximize} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "最大化侧边栏" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭侧边聊天" }));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not submit while the ephemeral thread is still preparing", async () => {
    const chat = fakeChat({ thread: null });
    render(<SideChatPanel chat={chat} maximized={false} onToggleMaximize={vi.fn()} onClose={vi.fn()} />);
    const textbox = screen.getByRole("textbox");
    expect((textbox as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "发送" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(textbox, { target: { value: "不会丢失" } });
    expect(chat.send).not.toHaveBeenCalled();
  });
});
