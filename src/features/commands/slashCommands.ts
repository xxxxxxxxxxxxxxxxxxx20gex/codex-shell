import {
  ListCollapse,
  ListChecks,
  Plug,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";

export type SlashCommandId = "skills" | "mcp" | "compact" | "plan" | "goal" | "review";

export interface SlashCommandDefinition {
  id: SlashCommandId;
  label: string;
  description: string;
  icon: LucideIcon;
  requiresThread?: boolean;
  blockedWhileRunning?: boolean;
}

const SLASH_COMMANDS: SlashCommandDefinition[] = [
  { id: "skills", label: "Skills", description: "选择 Skill 附加到下一条消息", icon: Sparkles },
  { id: "mcp", label: "MCP", description: "查看已配置的 MCP 服务器和工具", icon: Plug },
  { id: "compact", label: "压缩上下文", description: "总结当前对话，释放上下文空间", icon: ListCollapse, requiresThread: true, blockedWhileRunning: true },
  { id: "plan", label: "计划模式", description: "让 Codex 先分析需求并制定执行计划", icon: ListChecks, blockedWhileRunning: true },
  { id: "goal", label: "目标", description: "定义目标并让 Codex 持续推进", icon: Target, blockedWhileRunning: true },
  { id: "review", label: "代码审查", description: "使用 app-server 原生 Reviewer 审查修改", icon: ShieldCheck, requiresThread: true, blockedWhileRunning: true },
];

export function activeSlashCommandQuery(text: string) {
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(text);
  return match ? match[1].toLocaleLowerCase() : null;
}

export function matchingSlashCommands(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((command) => command.id.includes(normalized)
    || command.label.toLocaleLowerCase().includes(normalized));
}

export function parseSlashCommand(text: string) {
  const match = /^\/(skills|mcp|compact|plan|goal|review)(?:\s+(.*))?$/i.exec(text.trim());
  if (!match) return null;
  return { id: match[1].toLocaleLowerCase() as SlashCommandId, args: match[2]?.trim() ?? "" };
}
