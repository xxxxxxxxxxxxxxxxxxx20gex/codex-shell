import { useEffect, useRef } from "react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import { userMessageText } from "../runtime/sessionState";
import { agentMessageTiming, userMessageTiming } from "./conversationTiming";
import { TurnActivityItem } from "./TurnActivityItem";
import { TurnPlanView } from "./TurnPlanView";

interface Props {
  turns: Turn[];
  running: boolean;
  modelId: string;
  plansByTurnId?: Record<string, TurnPlanUpdatedNotification>;
}

function lastItemId(items: ThreadItem[], type: "userMessage" | "agentMessage") {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].type === type) return items[index].id;
  }
  return undefined;
}

export function ConversationTimeline({ turns, running, modelId, plansByTurnId = {} }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [running, turns]);

  return (
    <div className="timeline">
      {turns.map((turn, turnIndex) => {
        const items = turn.items;
        const hasAgentItem = items.some((item) => item.type === "agentMessage");
        const isActiveTurn = running && turnIndex === turns.length - 1;
        const lastUserMessageId = lastItemId(items, "userMessage");
        const lastAgentMessageId = lastItemId(items, "agentMessage");
        const sentTiming = userMessageTiming(turn);
        const answerTiming = agentMessageTiming(turn, isActiveTurn);
        return (
          <section className="conversation-turn" key={turn.id} data-status={turn.status}>
            {plansByTurnId[turn.id] && <TurnPlanView plan={plansByTurnId[turn.id]} />}
            {items.map((item) => item.type === "userMessage" ? (
              <div className="user-message-group" key={item.id}>
                <div className="user-message">{userMessageText(item)}</div>
                {item.id === lastUserMessageId && sentTiming && (
                  <div className="message-timing user-message-timing">{sentTiming}</div>
                )}
              </div>
            ) : item.type === "agentMessage" ? (
              <div className="agent-block" key={item.id}>
                <div className="agent-avatar">C</div>
                <div className="agent-content">
                  <div className="agent-meta"><strong>Codex</strong><span>{modelId}</span></div>
                  <p className={item.text ? "agent-response" : "agent-response pending"}>
                    {item.text || "正在等待模型响应…"}
                  </p>
                  {item.id === lastAgentMessageId && answerTiming && (
                    <div className="message-timing agent-message-timing">{answerTiming}</div>
                  )}
                </div>
              </div>
            ) : <TurnActivityItem item={item} key={item.id} />)}
            {isActiveTurn && !hasAgentItem && (
              <div className="agent-block">
                <div className="agent-avatar">C</div>
                <div className="agent-content">
                  <div className="agent-meta"><strong>Codex</strong><span>{modelId}</span></div>
                  <p className="agent-response pending">正在等待模型响应…</p>
                  {answerTiming && (
                    <div className="message-timing agent-message-timing">{answerTiming}</div>
                  )}
                </div>
              </div>
            )}
            {turn.error && <div className="turn-error">{turn.error.message}</div>}
          </section>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
