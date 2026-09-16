import { ChevronDown, Terminal } from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { formatTurnDuration } from "./conversationTiming";
import { TurnActivityItem } from "./TurnActivityItem";

type CommandItem = Extract<ThreadItem, { type: "commandExecution" }>;

interface Props {
  items: CommandItem[];
}

function drawerStatus(items: CommandItem[]) {
  if (items.some((item) => item.status === "inProgress")) return "正在执行命令";
  if (items.some((item) => item.status === "failed")) return "命令执行失败";
  if (items.some((item) => item.status === "declined")) return "命令未执行";
  return "运行了命令";
}

export function CommandDrawer({ items }: Props) {
  if (items.length === 0) return null;
  const command = items.length === 1 ? items[0] : null;
  const meta = command?.durationMs === null || command?.durationMs === undefined
    ? items.length > 1 ? `${items.length} 个命令` : ""
    : formatTurnDuration(command.durationMs);
  return (
    <details className="command-drawer">
      <summary>
        <span className="activity-icon"><Terminal aria-hidden="true" /></span>
        <span className="command-drawer-label">
          <strong>{drawerStatus(items)}</strong>
          {command && <code title={command.command}>{command.command}</code>}
        </span>
        {meta && <small>{meta}</small>}
        <i><ChevronDown aria-hidden="true" /></i>
      </summary>
      <div className="command-drawer-list">
        {items.map((item) => <TurnActivityItem item={item} key={item.id} />)}
      </div>
    </details>
  );
}
