import { useRef, useState } from "react";
import { ArrowUp, Check, Circle, MessageCircleQuestion } from "lucide-react";
import type { AsyncUserInputQuestion } from "../../generated/app-server/v2/AsyncUserInputQuestion";
import { MAX_MODEL_VISIBLE_INPUT_BYTES } from "../../shared/modelVisibleInput";
import { errorMessage } from "../../shared/errors";
import { buildQuestionReply, questionReplyId } from "./asyncQuestionReply";

interface Props {
  itemId: string;
  questions: AsyncUserInputQuestion[];
  replies?: ReadonlyMap<string, string>;
  onSubmit?: (text: string) => Promise<boolean> | boolean;
}

export function AsyncQuestionCard({ itemId, questions, replies, onSubmit }: Props) {
  const [draft, setDraft] = useState<string[]>(() => questions.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const answers = questions.map((_, index) => replies?.get(questionReplyId(itemId, index)) ?? draft[index] ?? "");
  const answered = submitted || questions.every((_, index) => replies?.has(questionReplyId(itemId, index)));
  const locked = answered || pending || !onSubmit;
  const complete = answers.every((answer) => answer.trim().length > 0);

  async function submit() {
    if (!onSubmit || !complete || answered || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    setError("");
    try {
      const snapshot = answers.map((answer) => answer.trim());
      const text = buildQuestionReply(itemId, questions, snapshot);
      if (!await onSubmit(text)) throw new Error("回答未发送，请稍后重试");
      setDraft(snapshot);
      setSubmitted(true);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }

  function changeAnswer(index: number, answer: string) {
    if (locked || busyRef.current) return;
    setDraft((current) => questions.map((_, i) => i === index ? answer : current[i] ?? ""));
  }

  return (
    <div className="async-question-card" aria-label="Codex 的问题" aria-busy={pending}>
      <div className="async-question-heading"><MessageCircleQuestion aria-hidden="true" /><strong>请回答</strong><span>{answered ? "已回答" : pending ? "发送中" : questions.length > 1 ? `${questions.length} 个问题` : "等待回答"}</span></div>
      {questions.map((question, index) => (
        <fieldset key={index} className="async-question" disabled={locked}>
          <legend>{question.title}</legend>
          {question.options?.map((option, optionIndex) => (
            <button type="button" key={optionIndex} className={answers[index] === option ? "selected" : ""} aria-pressed={answers[index] === option} disabled={locked} onClick={() => changeAnswer(index, option)}>{answers[index] === option ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}<span>{option}</span></button>
          ))}
          <input type="text" aria-label={question.title} value={answers[index]} disabled={locked} maxLength={MAX_MODEL_VISIBLE_INPUT_BYTES} placeholder={question.options?.length ? "选择一项，或输入其他回答" : "输入回答"} onChange={(event) => changeAnswer(index, event.target.value)} />
        </fieldset>
      ))}
      {error && <p className="async-question-error" role="alert">{error}</p>}
      <div className="async-question-footer"><span>{answered ? "回答已发送" : !onSubmit ? "当前暂不可发送" : "确认后发送回答"}</span>{onSubmit && <button type="button" className="async-question-submit" disabled={!complete || locked} onClick={() => void submit()}>{answered ? <Check aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}{answered ? "已发送回答" : pending ? "发送中…" : "发送回答"}</button>}</div>
    </div>
  );
}
