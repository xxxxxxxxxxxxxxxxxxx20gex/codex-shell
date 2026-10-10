// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AsyncQuestionCard } from "./AsyncQuestionCard";
import { buildQuestionReply, parseQuestionReply } from "./asyncQuestionReply";
import { ConversationTimeline } from "./ConversationTimeline";
import type { Turn } from "../../generated/app-server/v2/Turn";

afterEach(cleanup);
const questions = [{ title: "选择方向", options: ["A", "B"] }];

describe("async question submission", () => {
  it("allows a custom answer even when options exist and freezes pending input", async () => {
    let finish!: (value: boolean) => void;
    const send = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    render(<AsyncQuestionCard itemId="item" questions={questions} onSubmit={send} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "自定义" } });
    const submit = screen.getByRole("button", { name: "发送回答" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => finish(true));
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("自定义");
    expect((screen.getByRole("button", { name: "已发送回答" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each([false, new Error("网关失败")])("keeps the draft after failure %s and permits retry", async (failure) => {
    const send = vi.fn().mockImplementationOnce(() => failure instanceof Error ? Promise.reject(failure) : Promise.resolve(false)).mockResolvedValue(true);
    render(<AsyncQuestionCard itemId="item" questions={questions} onSubmit={send} />);
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "发送回答" })));
    expect(screen.getByRole("alert").textContent).toMatch(/失败|未发送/);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("A");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "发送回答" })));
    expect(send).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects the UTF-8 envelope limit before calling the sender", async () => {
    const send = vi.fn();
    render(<AsyncQuestionCard itemId="item" questions={questions} onSubmit={send} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "中".repeat(3000) } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "发送回答" })));
    expect(screen.getByRole("alert").textContent).toContain("8000 UTF-8");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send incomplete or read-only forms", () => {
    const send = vi.fn();
    const view = render(<AsyncQuestionCard itemId="item" questions={questions} onSubmit={send} />);
    fireEvent.click(screen.getByRole("button", { name: "发送回答" }));
    expect(send).not.toHaveBeenCalled();
    view.rerender(<AsyncQuestionCard itemId="item" questions={questions} />);
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
  });

  it("uses distinct stable identities for same-title questions and safely round-trips text", () => {
    const sameTitle = [{ title: '同名\n"问题"', options: null }, { title: '同名\n"问题"', options: null }];
    const parsed = parseQuestionReply(buildQuestionReply('item"id', sameTitle, ["甲", "乙"]));
    expect(parsed?.map((entry) => entry.questionItemId)).toEqual([
      JSON.stringify(["request_user_input_async", 'item"id', 0]), JSON.stringify(["request_user_input_async", 'item"id', 1]),
    ]);
    expect(parseQuestionReply('引用：' + buildQuestionReply("id", questions, ["A"]))).toBeNull();
    expect(parseQuestionReply('<send_user_message_question_reply>[null]</send_user_message_question_reply>')).toBeNull();
  });

  it("restores only confirmed replies on history reload and keeps other questions editable", () => {
    const reply = buildQuestionReply("item", questions, ["A"]);
    const turn: Turn = { id: "turn", status: "completed", itemsView: "full", error: null, startedAt: null, completedAt: null, durationMs: null, items: [
      { type: "agentMessage", id: "item", text: "选择方向", phase: "final_answer", delivery: "async", questions, memoryCitation: null },
      { type: "agentMessage", id: "other", text: "选择方向", phase: "final_answer", delivery: "async", questions, memoryCitation: null },
      { type: "userMessage", id: "local-user:turn", clientId: null, content: [{ type: "text", text: reply, text_elements: [] }] },
    ] };
    const view = render(<ConversationTimeline threadId="thread" turns={[turn]} running={false} onAnswerQuestions={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "已发送回答" })).toBeNull();
    view.unmount();
    turn.items[2].id = "core-user-id";
    render(<ConversationTimeline threadId="thread" turns={[turn]} running={false} onAnswerQuestions={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "已发送回答" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "发送回答" })).toHaveLength(1);
    expect(document.body.textContent).not.toContain("<send_user_message_question_reply>");
  });
});
