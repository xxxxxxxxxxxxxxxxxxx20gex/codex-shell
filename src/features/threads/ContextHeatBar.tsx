import { useState, type CSSProperties } from "react";
import type { ThreadTokenUsage } from "../../generated/app-server/v2/ThreadTokenUsage";
import { contextUsageView } from "./contextUsage";

interface ContextHeatBarProps {
  usage: ThreadTokenUsage | null;
  hasThread: boolean;
  running: boolean;
  onCompact: () => Promise<void>;
}
const tokenFormatter = new Intl.NumberFormat("zh-CN");

function formatTokens(tokens: number) {
  return tokenFormatter.format(tokens);
}

export function ContextHeatBar({ usage, hasThread, running, onCompact }: ContextHeatBarProps) {
  const [requesting, setRequesting] = useState(false);
  const view = contextUsageView(usage);
  const percentage = view.percentage ?? 0;
  const disabled = !hasThread || running || requesting;
  const actionText = requesting
    ? "正在请求压缩…"
    : running
      ? "当前任务完成后可以压缩"
      : hasThread
        ? "点击压缩当前上下文"
        : "发送消息创建 Session 后可用";
  const contextText = view.contextWindow === null
    ? `${formatTokens(view.contextTokens)} tokens · 模型未上报上下文窗口`
    : `${formatTokens(view.contextTokens)} / ${formatTokens(view.contextWindow)} tokens · ${percentage.toFixed(1)}%`;
  const label = `当前上下文 ${contextText}，Session 累计 ${formatTokens(view.sessionTokens)} tokens。${actionText}`;
  const style = { "--context-usage": `${percentage}%` } as CSSProperties;

  async function compact() {
    if (disabled) return;
    setRequesting(true);
    try {
      await onCompact();
    } finally {
      setRequesting(false);
    }
  }

  return (
    <button
      type="button"
      className={`context-heatbar ${view.percentage === null ? "unknown" : ""} ${requesting ? "requesting" : ""}`}
      style={style}
      disabled={disabled}
      onClick={() => void compact()}
      aria-label={label}
    >
      <span className="context-heatbar-track" aria-hidden="true">
        <span className="context-heatbar-mask" />
        <span className="context-heatbar-marker" />
      </span>
      <span className="context-heatbar-tooltip" role="tooltip">
        <strong>当前上下文</strong>
        <span>{contextText}</span>
        <span>Session 累计：{formatTokens(view.sessionTokens)} tokens</span>
        <em>{actionText}</em>
      </span>
    </button>
  );
}
