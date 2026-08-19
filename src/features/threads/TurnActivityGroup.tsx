import { useEffect, useState } from "react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import { formatTurnDuration } from "./conversationTiming";
import { CommandDrawer } from "./CommandDrawer";
import { TurnActivityItem } from "./TurnActivityItem";
import { MarkdownContent } from "./MarkdownContent";

interface Props {
  items: ThreadItem[];
  active: boolean;
  turnActive: boolean;
  startedAt: number | null;
  durationMs: number | null;
  retryingMessage?: string | null;
  showHeader: boolean;
  turnId: string;
  activeItemTurnIds: Record<string, string>;
  mcpProgressByItemId: Record<string, McpToolCallProgressNotification>;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenError?: (message: string) => void;
}

export function TurnActivityGroup({ items, active, turnActive, startedAt, durationMs, retryingMessage = null, showHeader, turnId, activeItemTurnIds, mcpProgressByItemId, onOpenPath, onOpenError }: Props) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!turnActive || startedAt === null) return;
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [startedAt, turnActive]);

  if (items.length === 0 && !showHeader) return null;
  const elapsedMs = turnActive && startedAt !== null
    ? Math.max(0, now - startedAt * 1_000)
    : durationMs;
  const duration = elapsedMs === null ? "" : ` ${formatTurnDuration(elapsedMs)}`;
  const activeItem = [...items].reverse().find((item) => activeItemTurnIds[item.id] === turnId);
  const activeProgress = activeItem ? mcpProgressByItemId[activeItem.id]?.message : null;
  const activityBlocks: Array<ThreadItem | { type: "commandDrawer"; items: Extract<ThreadItem, { type: "commandExecution" }>[] }> = [];
  let commandItems: Extract<ThreadItem, { type: "commandExecution" }>[] = [];
  const flushCommands = () => {
    if (commandItems.length === 0) return;
    activityBlocks.push({ type: "commandDrawer", items: commandItems });
    commandItems = [];
  };
  items.forEach((item) => {
    if (item.type === "commandExecution") commandItems.push(item);
    else {
      flushCommands();
      activityBlocks.push(item);
    }
  });
  flushCommands();

  return (
    <section className="turn-activity-stream" role={active ? "status" : undefined} aria-live={active ? "polite" : undefined}>
      {showHeader && <div className="turn-work-status">
        <span className={`turn-activity-indicator${turnActive ? " active" : ""}`} aria-hidden="true" />
        <strong>{`${turnActive ? "正在处理" : "已处理"}${duration}`}</strong>
        {turnActive && retryingMessage && <small className="turn-retry-status">{retryingMessage}</small>}
      </div>}
      {activityBlocks.length > 0 && <div className="turn-activity-list">
        {activityBlocks.map((item) => item.type === "commandDrawer" ? (
          <CommandDrawer items={item.items} key={`command-drawer:${item.items[0].id}`} />
        ) : item.type === "agentMessage" ? (
          <MarkdownContent className="turn-commentary" key={item.id} onOpenPath={onOpenPath} onOpenError={onOpenError}>{item.text}</MarkdownContent>
        ) : (
          <TurnActivityItem item={item} key={item.id} />
        ))}
        {activeProgress && <div className="turn-native-progress">{activeProgress}</div>}
      </div>}
    </section>
  );
}
