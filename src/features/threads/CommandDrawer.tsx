import { ChevronDown, Terminal } from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { TurnActivityItem } from "./TurnActivityItem";

type CommandItem = Extract<ThreadItem, { type: "commandExecution" }>;

interface Props {
  items: CommandItem[];
}

function drawerStatus(items: CommandItem[]) {
  if (items.some((item) => item.status === "inProgress")) return "正在执行命令";
  if (items.some((item) => item.status === "failed")) return "命令执行失败";
  if (items.some((item) => item.status === "declined")) return "命令未执行";
  return "命令执行完成";
}

export function CommandDrawer({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <details className="command-drawer">
      <summary>
        <span className="activity-icon"><Terminal aria-hidden="true" /></span>
        <strong>{drawerStatus(items)}</strong>
        <small>{items.length} 个命令</small>
        <i><ChevronDown aria-hidden="true" /></i>
      </summary>
      <div className="command-drawer-list">
        {items.map((item) => <TurnActivityItem item={item} key={item.id} />)}
      </div>
    </details>
  );
}
