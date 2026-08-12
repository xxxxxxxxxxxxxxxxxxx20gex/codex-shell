import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import { activityTitle, TurnActivityItem } from "./TurnActivityItem";
import { MarkdownContent } from "./MarkdownContent";

interface Props {
  items: ThreadItem[];
  active: boolean;
  turnId: string;
  activeItemTurnIds: Record<string, string>;
  mcpProgressByItemId: Record<string, McpToolCallProgressNotification>;
}

function failed(item: ThreadItem) {
  return "status" in item && (item.status === "failed" || item.status === "declined");
}

export function TurnActivityGroup({ items, active, turnId, activeItemTurnIds, mcpProgressByItemId }: Props) {
  if (items.length === 0) return null;
  const activeItem = [...items].reverse().find((item) => activeItemTurnIds[item.id] === turnId);
  const hasFailure = items.some(failed);
  const activeProgress = activeItem ? mcpProgressByItemId[activeItem.id]?.message : null;
  const status = activeProgress ?? (activeItem ? activityTitle(activeItem) : hasFailure ? "部分操作失败" : `已完成 ${items.length} 项活动`);

  return (
    <details className="turn-activity-group" open={active || hasFailure} role={active ? "status" : undefined} aria-live={active ? "polite" : undefined}>
      <summary>
        <span className={`turn-activity-indicator${active ? " active" : hasFailure ? " failed" : ""}`} aria-hidden="true" />
        <strong>{active ? "正在处理" : "执行过程"}</strong>
        <small>{status}</small>
        <i>⌄</i>
      </summary>
      <div className="turn-activity-list">
        {items.map((item) => item.type === "agentMessage" ? (
          <MarkdownContent className="turn-commentary" key={item.id}>{item.text}</MarkdownContent>
        ) : (
          <TurnActivityItem item={item} key={item.id} active={activeItemTurnIds[item.id] === turnId} />
        ))}
      </div>
    </details>
  );
}
