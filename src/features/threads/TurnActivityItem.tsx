import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FilePenLine,
  Image,
  ImagePlus,
  ListCollapse,
  ListChecks,
  Plug,
  Search,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { formatTurnDuration } from "./conversationTiming";

interface Props {
  item: ThreadItem;
}

function durationLabel(durationMs: number | null) {
  if (durationMs === null) return "";
  return formatTurnDuration(durationMs);
}

function jsonPreview(value: unknown) {
  const text = JSON.stringify(value, null, 2) ?? "";
  return text.length > 4_000 ? `${text.slice(0, 4_000)}\n…输出已截断` : text;
}

function activityIcon(item: ThreadItem) {
  switch (item.type) {
    case "reasoning": return null;
    case "plan": return <ListChecks aria-hidden="true" />;
    case "commandExecution": return <Terminal aria-hidden="true" />;
    case "fileChange": return <FilePenLine aria-hidden="true" />;
    case "mcpToolCall": return <Plug aria-hidden="true" />;
    case "dynamicToolCall": return <Wrench aria-hidden="true" />;
    case "collabAgentToolCall":
    case "subAgentActivity": return <Bot aria-hidden="true" />;
    case "webSearch": return <Search aria-hidden="true" />;
    case "imageView": return <Image aria-hidden="true" />;
    case "imageGeneration": return <ImagePlus aria-hidden="true" />;
    case "contextCompaction": return <ListCollapse aria-hidden="true" />;
    case "hookPrompt": return <Zap aria-hidden="true" />;
    case "sleep": return <Clock3 aria-hidden="true" />;
    case "enteredReviewMode":
    case "exitedReviewMode": return <CheckCircle2 aria-hidden="true" />;
    case "userMessage":
    case "agentMessage": return null;
  }
}

function activityTitle(item: ThreadItem) {
  switch (item.type) {
    case "reasoning": return item.summary.find((part) => part.trim()) ?? "分析过程";
    case "plan": return "执行计划";
    case "commandExecution": return "运行命令";
    case "fileChange": return `修改文件 · ${item.changes.length}`;
    case "mcpToolCall": return `${item.server} · ${item.tool}`;
    case "dynamicToolCall": return `${item.namespace ? `${item.namespace} · ` : ""}${item.tool}`;
    case "collabAgentToolCall": return `协作智能体 · ${item.tool}`;
    case "subAgentActivity": return `子智能体 · ${item.kind}`;
    case "webSearch": return `搜索网页 · ${item.query}`;
    case "imageView": return "查看图片";
    case "imageGeneration": return "生成图片";
    case "contextCompaction": return "已压缩会话上下文";
    case "hookPrompt": return "Hook 提示";
    case "sleep": return "等待";
    case "enteredReviewMode": return "进入代码审查";
    case "exitedReviewMode": return "完成代码审查";
    case "userMessage":
    case "agentMessage": return "";
  }
}

function localizedStatus(status: string) {
  switch (status) {
    case "inProgress": return "运行中";
    case "completed": return "已完成";
    case "failed": return "失败";
    case "declined": return "已拒绝";
    default: return status;
  }
}

function statusText(item: ThreadItem) {
  switch (item.type) {
    case "commandExecution": return `${localizedStatus(item.status)}${durationLabel(item.durationMs) ? ` · ${durationLabel(item.durationMs)}` : ""}`;
    case "fileChange": return localizedStatus(item.status);
    case "mcpToolCall": return `${localizedStatus(item.status)}${durationLabel(item.durationMs) ? ` · ${durationLabel(item.durationMs)}` : ""}`;
    case "dynamicToolCall": return localizedStatus(item.status);
    case "collabAgentToolCall": return localizedStatus(item.status);
    case "imageGeneration": return localizedStatus(item.status);
    default: return "";
  }
}

function ActivityBody({ item }: Props) {
  switch (item.type) {
    case "reasoning":
      return item.content.length > 0 ? <pre>{item.content.join("\n")}</pre> : null;
    case "plan":
      return <p>{item.text}</p>;
    case "commandExecution":
      return <>
        <code className="activity-command">{item.command}</code>
        <small>{item.cwd}</small>
        {item.aggregatedOutput && <pre>{item.aggregatedOutput}</pre>}
        {item.exitCode !== null && <small>退出码：{item.exitCode}</small>}
      </>;
    case "fileChange":
      return <ul>{item.changes.map((change) => (
        <li key={`${change.path}:${change.kind.type}`}>
          <span data-kind={change.kind.type}>{change.kind.type}</span>
          <code>{change.path}</code>
        </li>
      ))}</ul>;
    case "mcpToolCall":
      return <>
        <pre>{jsonPreview(item.arguments)}</pre>
        {item.result && <pre>{jsonPreview(item.result)}</pre>}
        {item.error && <pre className="activity-error">{jsonPreview(item.error)}</pre>}
      </>;
    case "dynamicToolCall":
      return <>
        <pre>{jsonPreview(item.arguments)}</pre>
        {item.contentItems && <pre>{jsonPreview(item.contentItems)}</pre>}
      </>;
    case "collabAgentToolCall":
      return <>
        {item.prompt && <p>{item.prompt}</p>}
        {item.receiverThreadIds.length > 0 && <small>目标：{item.receiverThreadIds.join(", ")}</small>}
      </>;
    case "subAgentActivity":
      return <code>{item.agentPath || item.agentThreadId}</code>;
    case "webSearch":
      return <>{item.results && <pre>{jsonPreview(item.results)}</pre>}</>;
    case "imageView":
      return <code>{item.path}</code>;
    case "imageGeneration":
      return <>
        {item.revisedPrompt && <p>{item.revisedPrompt}</p>}
        {item.savedPath && <code>{item.savedPath}</code>}
      </>;
    case "hookPrompt":
      return <pre>{jsonPreview(item.fragments)}</pre>;
    case "sleep":
      return <pre>{jsonPreview(item)}</pre>;
    case "enteredReviewMode":
    case "exitedReviewMode":
      return <p>{item.review}</p>;
    case "contextCompaction":
    case "userMessage":
    case "agentMessage":
      return null;
  }
}

export function TurnActivityItem({ item }: Props) {
  if (item.type === "userMessage" || item.type === "agentMessage") return null;
  if (item.type === "reasoning" && item.content.length === 0) {
    return <div className="activity-reasoning-note">{item.summary.join("\n")}</div>;
  }
  const expandable = item.type !== "contextCompaction";
  if (!expandable) {
    return <div className="activity-note"><span>{activityIcon(item)}</span>{activityTitle(item)}</div>;
  }
  const itemClass = item.type === "commandExecution"
    ? " activity-command-card"
    : item.type === "reasoning" ? " activity-reasoning-card" : "";
  return (
    <details className={`activity-card${itemClass}`}>
      <summary>
        <span className="activity-icon">{activityIcon(item)}</span>
        <strong>{activityTitle(item)}</strong>
        {statusText(item) && <small>{statusText(item)}</small>}
        <i><ChevronDown aria-hidden="true" /></i>
      </summary>
      <div className="activity-body"><ActivityBody item={item} /></div>
    </details>
  );
}
