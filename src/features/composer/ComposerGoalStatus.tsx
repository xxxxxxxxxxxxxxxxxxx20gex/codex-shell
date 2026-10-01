import { Target, X } from "lucide-react";
import type { ThreadGoal } from "../../generated/app-server/v2/ThreadGoal";
import { CompactIconButton } from "../../shared/CompactIconButton";
import { formatTurnDuration } from "../threads/conversationTiming";

interface Props {
  goal: ThreadGoal;
  onClear: () => void;
}

const STATUS_LABELS: Record<ThreadGoal["status"], string> = {
  active: "进行中",
  paused: "已暂停",
  blocked: "受阻",
  usageLimited: "用量受限",
  budgetLimited: "预算受限",
  complete: "已完成",
};

export function ComposerGoalStatus({ goal, onClear }: Props) {
  const status = STATUS_LABELS[goal.status];
  return (
    <div className="composer-goal-status" role="group" aria-label="当前目标">
      <Target aria-hidden="true" />
      <strong title={goal.objective}>目标：{goal.objective}</strong>
      <span>{status}</span>
      {goal.timeUsedSeconds > 0 && <time>{formatTurnDuration(goal.timeUsedSeconds * 1000)}</time>}
      <CompactIconButton label={`清除当前目标：${goal.objective}`} title="清除当前目标" icon={<X aria-hidden="true" />} onClick={onClear} />
    </div>
  );
}
