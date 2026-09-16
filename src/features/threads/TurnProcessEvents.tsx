import { ChevronDown, ShieldCheck, Terminal } from "lucide-react";
import type { ThreadProcessEvent } from "../runtime/sessionState";

interface Props {
  events: ThreadProcessEvent[];
}

function reviewLabel(event: Extract<ThreadProcessEvent, { kind: "autoApprovalReview" }>) {
  if (event.status === "started") return "正在自动审查操作";
  const status = event.reviewStatus === "approved"
    ? "自动审查已批准"
    : event.reviewStatus === "denied"
      ? "自动审查已拒绝"
      : "自动审查已完成";
  return event.riskLevel ? `${status} · 风险 ${event.riskLevel}` : status;
}

export function TurnProcessEvents({ events }: Props) {
  if (events.length === 0) return null;
  const reviewEvents = events.filter((event) => event.kind === "autoApprovalReview");
  const terminalEvents = events.filter((event) => event.kind === "terminalInteraction");
  return <div className="turn-process-events" aria-label="运行时过程事件">
    {reviewEvents.map((event) => (
      <div className="turn-process-event" key={`review:${event.reviewId}`}>
        <ShieldCheck aria-hidden="true" />
        <span>{reviewLabel(event)}</span>
      </div>
    ))}
    {terminalEvents.length > 0 && <details className="terminal-interaction-disclosure">
      <summary>
        <Terminal aria-hidden="true" />
        <span>终端交互 · {terminalEvents.length} 次</span>
        <ChevronDown aria-hidden="true" />
      </summary>
      <div>
        {terminalEvents.map((event, index) => (
          <div className="turn-process-event" key={`terminal:${event.itemId}:${event.processId}:${index}`}>
            <Terminal aria-hidden="true" />
            <span>已向运行中的命令发送输入 · {event.stdinLength} 字符</span>
          </div>
        ))}
      </div>
    </details>}
  </div>;
}
