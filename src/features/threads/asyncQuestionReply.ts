import type { AsyncUserInputQuestion } from "../../generated/app-server/v2/AsyncUserInputQuestion";
import { assertModelVisibleInput } from "../../shared/modelVisibleInput";

export interface QuestionReply {
  questionItemId: string;
  question: string;
  answer: string;
}

const OPEN = "<send_user_message_question_reply>";
const CLOSE = "</send_user_message_question_reply>";

export function questionReplyId(itemId: string, index: number) {
  return JSON.stringify(["request_user_input_async", itemId, index]);
}

export function buildQuestionReply(itemId: string, questions: AsyncUserInputQuestion[], answers: string[]) {
  const replies = questions.map((question, index): QuestionReply => {
    const answer = answers[index]?.trim();
    if (!answer) throw new Error("请回答全部问题");
    return { questionItemId: questionReplyId(itemId, index), question: question.title, answer };
  });
  const text = `${OPEN}\n${JSON.stringify(replies)}\n${CLOSE}`;
  assertModelVisibleInput(text, "问答回答");
  return text;
}

// Only a complete, valid native envelope is a reply; quoted examples remain ordinary text.
export function parseQuestionReply(text: string): QuestionReply[] | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith(OPEN) || !trimmed.endsWith(CLOSE)) return null;
  try {
    const value: unknown = JSON.parse(trimmed.slice(OPEN.length, -CLOSE.length));
    if (!Array.isArray(value) || value.length === 0) return null;
    if (!value.every((entry): entry is QuestionReply => entry !== null && typeof entry === "object"
      && typeof entry.questionItemId === "string" && typeof entry.question === "string"
      && typeof entry.answer === "string" && entry.answer.trim().length > 0)) return null;
    return value;
  } catch {
    return null;
  }
}
