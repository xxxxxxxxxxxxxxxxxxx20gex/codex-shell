export type SlashCommandId = "skills" | "mcp" | "compact" | "plan" | "goal";

export interface SlashCommandDefinition {
  id: SlashCommandId;
  label: string;
  description: string;
  icon: string;
  requiresThread?: boolean;
  blockedWhileRunning?: boolean;
}

const SLASH_COMMANDS: SlashCommandDefinition[] = [
  { id: "skills", label: "Skills", description: "选择 Skill 附加到下一条消息", icon: "✦" },
  { id: "mcp", label: "MCP", description: "查看已配置的 MCP 服务器和工具", icon: "⌘" },
  { id: "compact", label: "压缩上下文", description: "总结当前对话，释放上下文空间", icon: "⇣", requiresThread: true, blockedWhileRunning: true },
  { id: "plan", label: "计划模式", description: "让 Codex 先分析需求并制定执行计划", icon: "☷", blockedWhileRunning: true },
  { id: "goal", label: "目标", description: "查看、设置或清除长期任务目标", icon: "◎", requiresThread: true },
];

export function activeSlashCommandQuery(text: string) {
  const match = /^\/([^\s/]*)$/.exec(text);
  return match ? match[1].toLocaleLowerCase() : null;
}

export function matchingSlashCommands(query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((command) => command.id.includes(normalized)
    || command.label.toLocaleLowerCase().includes(normalized));
}

export function parseSlashCommand(text: string) {
  const match = /^\/(skills|mcp|compact|plan|goal)(?:\s+(.*))?$/i.exec(text.trim());
  if (!match) return null;
  return { id: match[1].toLocaleLowerCase() as SlashCommandId, args: match[2]?.trim() ?? "" };
}
