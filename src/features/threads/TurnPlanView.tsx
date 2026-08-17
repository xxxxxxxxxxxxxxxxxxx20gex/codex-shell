import { CheckCircle2, Circle, CircleDot, ListChecks } from "lucide-react";
import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";

interface Props {
  plan: TurnPlanUpdatedNotification;
}

const statusIcon = {
  pending: Circle,
  inProgress: CircleDot,
  completed: CheckCircle2,
} as const;

export function TurnPlanView({ plan }: Props) {
  if (plan.plan.length === 0) return null;
  return (
    <section className="live-plan" aria-label="执行计划">
      <header><span><ListChecks aria-hidden="true" /></span><strong>执行计划</strong></header>
      {plan.explanation && <p>{plan.explanation}</p>}
      <ol>
        {plan.plan.map((item, index) => {
          const StatusIcon = statusIcon[item.status];
          return <li key={`${index}:${item.step}`} data-status={item.status}>
            <span><StatusIcon aria-hidden="true" /></span>{item.step}
          </li>;
        })}
      </ol>
    </section>
  );
}
