import { Target, X } from "lucide-react";
import type { ThreadGoal } from "../../generated/app-server/v2/ThreadGoal";

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
    <button
      type="button"
      className="composer-intent-button goal active-goal"
      onClick={onClear}
      title={`当前目标：${goal.objective}（${status}）。点击清除`}
      aria-label={`清除当前目标：${goal.objective}`}
    >
      <span><Target aria-hidden="true" /></span>
      <b>目标：{goal.objective}</b>
      <small>{status}</small>
      <i><X aria-hidden="true" /></i>
    </button>
  );
}
