import type { TurnPlanUpdatedNotification } from "../../generated/app-server/v2/TurnPlanUpdatedNotification";

interface Props {
  plan: TurnPlanUpdatedNotification;
}

const statusIcon = {
  pending: "○",
  inProgress: "◐",
  completed: "●",
} as const;

export function TurnPlanView({ plan }: Props) {
  if (plan.plan.length === 0) return null;
  return (
    <section className="live-plan" aria-label="执行计划">
      <header><span>☷</span><strong>执行计划</strong></header>
      {plan.explanation && <p>{plan.explanation}</p>}
      <ol>
        {plan.plan.map((item, index) => (
          <li key={`${index}:${item.step}`} data-status={item.status}>
            <span>{statusIcon[item.status]}</span>{item.step}
          </li>
        ))}
      </ol>
    </section>
  );
}
