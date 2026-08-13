import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import { formatTurnDuration } from "./conversationTiming";
import { TurnActivityItem } from "./TurnActivityItem";
import { MarkdownContent } from "./MarkdownContent";

interface Props {
  items: ThreadItem[];
  active: boolean;
  turnActive: boolean;
  durationMs: number | null;
  showHeader: boolean;
  turnId: string;
  activeItemTurnIds: Record<string, string>;
  mcpProgressByItemId: Record<string, McpToolCallProgressNotification>;
}

export function TurnActivityGroup({ items, active, turnActive, durationMs, showHeader, turnId, activeItemTurnIds, mcpProgressByItemId }: Props) {
  if (items.length === 0) return null;
  const duration = durationMs === null ? "" : ` ${formatTurnDuration(durationMs)}`;
  const activeItem = [...items].reverse().find((item) => activeItemTurnIds[item.id] === turnId);
  const activeProgress = activeItem ? mcpProgressByItemId[activeItem.id]?.message : null;

  return (
    <section className="turn-activity-stream" role={active ? "status" : undefined} aria-live={active ? "polite" : undefined}>
      {showHeader && <div className="turn-work-status">
        <span className={`turn-activity-indicator${turnActive ? " active" : ""}`} aria-hidden="true" />
        <strong>{turnActive ? "正在处理" : `已处理${duration}`}</strong>
      </div>}
      <div className="turn-activity-list">
        {items.map((item) => item.type === "agentMessage" ? (
          <MarkdownContent className="turn-commentary" key={item.id}>{item.text}</MarkdownContent>
        ) : (
          <TurnActivityItem item={item} key={item.id} active={activeItemTurnIds[item.id] === turnId} />
        ))}
        {activeProgress && <div className="turn-native-progress">{activeProgress}</div>}
      </div>
    </section>
  );
}
