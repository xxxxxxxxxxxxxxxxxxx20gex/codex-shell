import type { ThreadTokenUsage } from "../../generated/app-server/v2/ThreadTokenUsage";

export interface ContextUsageView {
  contextTokens: number;
  sessionTokens: number;
  contextWindow: number | null;
  percentage: number | null;
}
export function contextUsageView(usage: ThreadTokenUsage | null): ContextUsageView {
  const contextTokens = Math.max(usage?.last.totalTokens ?? 0, 0);
  const sessionTokens = Math.max(usage?.total.totalTokens ?? 0, 0);
  const contextWindow = usage?.modelContextWindow && usage.modelContextWindow > 0
    ? usage.modelContextWindow
    : null;
  const percentage = contextWindow === null
    ? null
    : Math.min((contextTokens / contextWindow) * 100, 100);

  return { contextTokens, sessionTokens, contextWindow, percentage };
}
