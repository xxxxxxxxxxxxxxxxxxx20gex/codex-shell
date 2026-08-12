import { useEffect, useState } from "react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import { userMessageText } from "../runtime/sessionState";
import { agentMessageTiming, userMessageTiming } from "./conversationTiming";
import { TurnActivityItem } from "./TurnActivityItem";
import { TurnFileChanges } from "./TurnFileChanges";
import { TurnPlanView } from "./TurnPlanView";
import { TurnProgressIndicator } from "./TurnProgressIndicator";
import { writeClipboardText } from "./clipboard";

interface Props {
  turn: Turn;
  active: boolean;
  canFork: boolean;
  onFork?: () => void;
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
  canFork,
  onFork,
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
  const [copyFeedback, setCopyFeedback] = useState(false);
  const agentText = items.filter((item) => item.type === "agentMessage").map((item) => item.text).join("\n\n");
  const firstAgentMessageId = items.find((item) => item.type === "agentMessage")?.id;
  const fileChangeItems = items.filter((item): item is Extract<ThreadItem, { type: "fileChange" }> => item.type === "fileChange");

  useEffect(() => {
    if (!copyFeedback) return;
    const timeout = window.setTimeout(() => setCopyFeedback(false), 1_800);
    return () => window.clearTimeout(timeout);
  }, [copyFeedback]);

  async function copyResponse() {
    try {
      await writeClipboardText(agentText);
      setCopyFeedback(true);
    } catch {
      setCopyFeedback(false);
    }
  }

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
        <div className={`agent-block${item.id === firstAgentMessageId ? "" : " agent-block-continuation"}`} key={item.id}>
          {item.id === firstAgentMessageId && <div className="agent-accent" aria-hidden="true" />}
          <div className="agent-content">
            <p className={item.text ? "agent-response" : "agent-response pending"}>
              {item.text || "正在等待模型响应…"}
            </p>
            {item.id === lastAgentMessageId && answerTiming && (
              <div className="message-timing agent-message-timing">{answerTiming}</div>
            )}
            {item.id === lastAgentMessageId && !active && agentText && (
              <div className="message-actions">
                <button type="button" onClick={() => void copyResponse()} aria-label={copyFeedback ? "已复制回答" : "复制回答"} title={copyFeedback ? "已复制回答" : "复制回答"}>
                  <svg aria-hidden="true" viewBox="0 0 16 16"><rect x="5.5" y="5.5" width="7" height="7" rx="1" /><path d="M10.5 5.5V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1h1.5" /></svg>
                </button>
                {canFork && <button type="button" onClick={onFork} aria-label="分叉 Session" title="分叉 Session">
                  <svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="7" r="1.5" /><circle cx="5" cy="13" r="1.5" /><path d="M5 4.5v7M6.5 7h3" /></svg>
                </button>}
              </div>
            )}
          </div>
        </div>
      ) : item.type !== "fileChange" ? (
        <TurnActivityItem
          item={item}
          key={item.id}
          active={activeItemTurnIds[item.id] === turn.id}
        />
      ) : null)}
      {active && (
        <TurnProgressIndicator
          turn={turn}
          activeItemTurnIds={activeItemTurnIds}
          mcpProgressByItemId={mcpProgressByItemId}
        />
      )}
      {active && !hasAgentItem && (
        <div className="agent-block">
          <div className="agent-accent" aria-hidden="true" />
          <div className="agent-content">
            <p className="agent-response pending">
              {hasActiveProcess ? "正在处理任务…" : "正在等待模型响应…"}
            </p>
            {answerTiming && (
              <div className="message-timing agent-message-timing">{answerTiming}</div>
            )}
          </div>
        </div>
      )}
      {fileChangeItems.length > 0 && <TurnFileChanges items={fileChangeItems} />}
      {turn.error && <div className="turn-error">{turn.error.message}</div>}
    </section>
  );
}
