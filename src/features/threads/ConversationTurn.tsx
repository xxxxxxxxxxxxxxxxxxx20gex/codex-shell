import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import { userMessageText } from "../runtime/sessionState";
import { agentMessageTiming, userMessageTiming } from "./conversationTiming";
import { TurnActivityItem } from "./TurnActivityItem";
import { TurnPlanView } from "./TurnPlanView";
import { TurnProgressIndicator } from "./TurnProgressIndicator";

interface Props {
  turn: Turn;
  active: boolean;
  modelId: string;
  plan?: TurnPlanUpdatedNotification;
  activeItemTurnIds: Record<string, string>;
  mcpProgressByItemId: Record<string, McpToolCallProgressNotification>;
}

function lastItemId(items: ThreadItem[], type: "userMessage" | "agentMessage") {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (items[index].type === type) return items[index].id;
  }
  return undefined;
}

export function ConversationTurn({
  turn,
  active,
  modelId,
  plan,
  activeItemTurnIds,
  mcpProgressByItemId,
}: Props) {
  const items = turn.items;
  const hasAgentItem = items.some((item) => item.type === "agentMessage");
  const hasActiveProcess = items.some((item) => activeItemTurnIds[item.id] === turn.id
    && item.type !== "userMessage" && item.type !== "agentMessage");
  const lastUserMessageId = lastItemId(items, "userMessage");
  const lastAgentMessageId = lastItemId(items, "agentMessage");
  const sentTiming = userMessageTiming(turn);
  const answerTiming = agentMessageTiming(turn, active);

  return (
    <section className="conversation-turn" data-status={turn.status}>
      {plan && <TurnPlanView plan={plan} />}
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
      ) : (
        <TurnActivityItem
          item={item}
          key={item.id}
          active={activeItemTurnIds[item.id] === turn.id}
        />
      ))}
      {active && (
        <TurnProgressIndicator
          turn={turn}
          activeItemTurnIds={activeItemTurnIds}
          mcpProgressByItemId={mcpProgressByItemId}
        />
      )}
      {active && !hasAgentItem && (
        <div className="agent-block">
          <div className="agent-avatar">C</div>
          <div className="agent-content">
            <div className="agent-meta"><strong>Codex</strong><span>{modelId}</span></div>
            <p className="agent-response pending">
              {hasActiveProcess ? "Codex 正在处理任务…" : "正在等待模型响应…"}
            </p>
            {answerTiming && (
              <div className="message-timing agent-message-timing">{answerTiming}</div>
            )}
          </div>
        </div>
      )}
      {turn.error && <div className="turn-error">{turn.error.message}</div>}
    </section>
  );
}
