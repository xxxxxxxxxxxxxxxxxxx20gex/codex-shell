import type { McpToolCallProgressNotification } from "../../generated/app-server/v2/McpToolCallProgressNotification";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";

interface Props {
  turn: Turn;
  activeItemTurnIds: Record<string, string>;
  mcpProgressByItemId: Record<string, McpToolCallProgressNotification>;
}

function progressLabel(item: ThreadItem, mcpProgress?: string) {
  switch (item.type) {
    case "reasoning": return "正在分析问题";
    case "plan": return "正在制定计划";
    case "commandExecution": return `正在执行命令 · ${item.command}`;
    case "fileChange": return "正在处理文件变更";
    case "mcpToolCall": return mcpProgress || `正在调用 MCP · ${item.server} / ${item.tool}`;
    case "dynamicToolCall": return `正在调用工具 · ${item.tool}`;
    case "collabAgentToolCall": return "正在协调协作智能体";
    case "subAgentActivity": return "子智能体正在工作";
    case "webSearch": return `正在搜索网页 · ${item.query}`;
    case "imageView": return "正在查看图片";
    case "imageGeneration": return "正在生成图片";
    case "contextCompaction": return "正在压缩对话上下文";
    case "hookPrompt": return "正在运行 Hook";
    case "sleep": return "正在等待";
    case "enteredReviewMode": return "正在进入代码审查";
    case "exitedReviewMode": return "正在完成代码审查";
    case "userMessage":
    case "agentMessage": return "";
  }
}

export function TurnProgressIndicator({
  turn,
  activeItemTurnIds,
  mcpProgressByItemId,
}: Props) {
  const activeItems = turn.items.filter((item) => activeItemTurnIds[item.id] === turn.id);
  const item = activeItems[activeItems.length - 1];
  if (!item || item.type === "userMessage" || item.type === "agentMessage") return null;
  const label = progressLabel(item, mcpProgressByItemId[item.id]?.message);
  if (!label) return null;

  return (
    <div className="turn-progress" role="status" aria-live="polite">
      <span className="turn-progress-pulse" />
      <strong>{label}</strong>
      {activeItems.length > 1 && <small>另有 {activeItems.length - 1} 项活动</small>}
    </div>
  );
}
