import { Fragment, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";
import { agentMessageTiming, formatTurnDuration, turnDurationMs, userMessageTiming } from "./conversationTiming";
import { TurnActivityGroup } from "./TurnActivityGroup";
import { TurnFileChanges } from "./TurnFileChanges";
import { TurnPlanView } from "./TurnPlanView";
import { TurnProgressIndicator } from "./TurnProgressIndicator";
import { writeClipboardText } from "./clipboard";
import { MarkdownContent } from "./MarkdownContent";
import { AttachmentGallery } from "../attachments/AttachmentGallery";
import { userMessagePresentation } from "../runtime/userMessagePresentation";

interface Props {
  turn: Turn;
  active: boolean;
  retryingMessage?: string | null;
  canFork: boolean;
  onFork?: () => void;
  plan?: TurnPlanUpdatedNotification;
  activeItemTurnIds: Record<string, string>;
  mcpProgressByItemId: Record<string, McpToolCallProgressNotification>;
  readFile?: (path: string) => Promise<string>;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenError?: (message: string) => void;
}

type UserMessageItem = Extract<ThreadItem, { type: "userMessage" }>;
type AgentMessageItem = Extract<ThreadItem, { type: "agentMessage" }>;
type TurnBlock =
  | { type: "user"; item: UserMessageItem }
  | { type: "answer"; item: AgentMessageItem }
  | { type: "activity"; items: ThreadItem[] };

function hasVisibleContent(item: ThreadItem) {
  return item.type !== "reasoning"
    || item.summary.some((part) => part.trim().length > 0)
    || item.content.some((part) => part.trim().length > 0);
}

function orderedTurnBlocks(items: ThreadItem[]) {
  const blocks: TurnBlock[] = [];
  let activityItems: ThreadItem[] = [];
  const flushActivity = () => {
    if (activityItems.length === 0) return;
    blocks.push({ type: "activity", items: activityItems });
    activityItems = [];
  };

  items.forEach((item) => {
    if (!hasVisibleContent(item)) return;
    if (item.type === "fileChange") return;
    if (item.type === "userMessage") {
      flushActivity();
      blocks.push({ type: "user", item });
      return;
    }
    if (item.type === "agentMessage" && item.phase !== "commentary") {
      flushActivity();
      blocks.push({ type: "answer", item });
      return;
    }
    activityItems.push(item);
  });
  flushActivity();

  const initialUserIndex = blocks.findIndex(
    (block) => block.type === "user" && block.item.clientId === null,
  );
  if (initialUserIndex <= 0) return blocks;
  const leadingBlocks = blocks.slice(0, initialUserIndex);
  if (leadingBlocks.every((block) => block.type === "activity")) {
    return [blocks[initialUserIndex], ...leadingBlocks, ...blocks.slice(initialUserIndex + 1)];
  }
  return blocks;
}

function lastActivityBlockIndex(blocks: TurnBlock[]) {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (blocks[index].type === "activity") return index;
  }
  return -1;
}

export function ConversationTurn({
  turn,
  active,
  retryingMessage = null,
  canFork,
  onFork,
  plan,
  activeItemTurnIds,
  mcpProgressByItemId,
  readFile,
  onOpenPath,
  onOpenError,
}: Props) {
  const items = turn.items;
  const blocks = orderedTurnBlocks(items);
  const hasActiveProcess = items.some((item) => activeItemTurnIds[item.id] === turn.id
    && item.type !== "userMessage" && item.type !== "agentMessage");
  const firstUserMessageId = items.find((item) => item.type === "userMessage")?.id;
  const answerItems = items.filter((item): item is Extract<ThreadItem, { type: "agentMessage" }> => item.type === "agentMessage" && item.phase !== "commentary");
  const activityItems = items.filter((item) => hasVisibleContent(item)
    && item.type !== "userMessage"
    && item.type !== "fileChange"
    && !(item.type === "agentMessage" && item.phase !== "commentary"));
  const firstUserBlockIndex = blocks.findIndex((block) => block.type === "user");
  const firstActivityBlockIndex = blocks.findIndex((block) => block.type === "activity");
  const finalActivityBlockIndex = lastActivityBlockIndex(blocks);
  const finalAnswerBlockIndex = blocks.reduce((lastIndex, block, index) => block.type === "answer" ? index : lastIndex, -1);
  const activityBlocks = blocks.filter((block): block is Extract<TurnBlock, { type: "activity" }> => block.type === "activity");
  const userMessageCount = items.filter((item) => item.type === "userMessage").length;
  const collapseCompletedProcess = !active && turn.status === "completed" && userMessageCount <= 1 && answerItems.length > 0
    && activityBlocks.length > 0 && finalActivityBlockIndex < finalAnswerBlockIndex;
  const durationMs = turnDurationMs(turn);
  const completedProcessDuration = durationMs === null ? "" : ` ${formatTurnDuration(durationMs)}`;
  const lastAgentMessageId = answerItems[answerItems.length - 1]?.id;
  const sentTiming = userMessageTiming(turn);
  const answerTiming = agentMessageTiming(turn, active);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const agentText = answerItems.map((item) => item.text).join("\n\n");
  const firstAgentMessageId = answerItems[0]?.id;
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
      {plan && firstUserBlockIndex < 0 && <TurnPlanView plan={plan} />}
      {blocks.map((block, blockIndex) => (
        <Fragment key={block.type === "activity" ? `activity:${block.items[0].id}` : block.item.id}>
          {block.type === "user" && (
            <div className="user-message-group">
              {(() => {
                const message = userMessagePresentation(block.item);
                return <>
                  {(message.files.length > 0 || message.images.length > 0) && readFile && (
                    <AttachmentGallery files={message.files} images={message.images} readFile={readFile} align="end" />
                  )}
                  {message.text && <div className="user-message">{message.text}</div>}
                </>;
              })()}
              {block.item.id === firstUserMessageId && sentTiming && (
                <div className="message-timing user-message-timing">{sentTiming}</div>
              )}
            </div>
          )}
          {plan && blockIndex === firstUserBlockIndex && <TurnPlanView plan={plan} />}
          {block.type === "activity" && (
            collapseCompletedProcess
              ? blockIndex === firstActivityBlockIndex && (
                <details className="turn-process-disclosure">
                  <summary>
                    <span className="turn-activity-indicator" aria-hidden="true" />
                    <strong>{`已处理${completedProcessDuration}`}</strong>
                    <i><ChevronDown aria-hidden="true" /></i>
                  </summary>
                  <div className="turn-process-content">
                    {activityBlocks.map((activityBlock) => (
                      <TurnActivityGroup
                        key={`completed-activity:${activityBlock.items[0].id}`}
                        items={activityBlock.items}
                        active={false}
                        turnActive={false}
                        startedAt={turn.startedAt}
                        durationMs={durationMs}
                        retryingMessage={retryingMessage}
                        showHeader={false}
                        turnId={turn.id}
                        activeItemTurnIds={activeItemTurnIds}
                        mcpProgressByItemId={mcpProgressByItemId}
                        onOpenPath={onOpenPath}
                        onOpenError={onOpenError}
                      />
                    ))}
                  </div>
                </details>
              )
              : <TurnActivityGroup
                items={block.items}
                active={active && (blockIndex === finalActivityBlockIndex || block.items.some((item) => activeItemTurnIds[item.id] === turn.id))}
                turnActive={active}
                startedAt={turn.startedAt}
                durationMs={durationMs}
                retryingMessage={retryingMessage}
                showHeader={blockIndex === firstActivityBlockIndex}
                turnId={turn.id}
                activeItemTurnIds={activeItemTurnIds}
                mcpProgressByItemId={mcpProgressByItemId}
                onOpenPath={onOpenPath}
                onOpenError={onOpenError}
              />
          )}
          {block.type === "answer" && (
            <div className={`agent-block${block.item.id === firstAgentMessageId ? "" : " agent-block-continuation"}`}>
              {block.item.id === firstAgentMessageId && <div className="agent-accent" aria-hidden="true" />}
              <div className="agent-content">
                <MarkdownContent className={block.item.text ? "agent-response" : "agent-response pending"} onOpenPath={onOpenPath} onOpenError={onOpenError}>
                  {block.item.text || "正在等待模型响应…"}
                </MarkdownContent>
                {block.item.id === lastAgentMessageId && answerTiming && (
                  <div className="message-timing agent-message-timing">{answerTiming}</div>
                )}
                {block.item.id === lastAgentMessageId && !active && agentText && (
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
          )}
        </Fragment>
      ))}
      {active && activityItems.length === 0 && (
        <TurnProgressIndicator
          turn={turn}
          activeItemTurnIds={activeItemTurnIds}
          mcpProgressByItemId={mcpProgressByItemId}
        />
      )}
      {active && answerItems.length === 0 && activityItems.length === 0 && (
        <div className="agent-block">
          <div className="agent-accent" aria-hidden="true" />
          <div className="agent-content">
            <p className="agent-response pending">
              {hasActiveProcess ? "正在处理任务…" : "正在等待模型响应…"}
            </p>
            {answerTiming && (
              <div className="message-timing agent-message-timing">{answerTiming}</div>
            )}
            {retryingMessage && <div className="turn-retry-status standalone">{retryingMessage}</div>}
          </div>
        </div>
      )}
      {fileChangeItems.length > 0 && <TurnFileChanges items={fileChangeItems} />}
      {turn.error && <div className="turn-error">{turn.error.message}</div>}
    </section>
  );
}
