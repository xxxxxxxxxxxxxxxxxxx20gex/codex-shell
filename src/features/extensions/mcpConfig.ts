import type { JsonValue } from "../../generated/app-server/serde_json/JsonValue";
import type { ConfigReadResponse } from "../../generated/app-server/v2/ConfigReadResponse";

export type McpConfig = { [key: string]: JsonValue | undefined };
export interface UserMcpConfig { version: string; servers: Record<string, McpConfig>; }

export function userMcpConfig(response: ConfigReadResponse): UserMcpConfig {
  const layer = response.layers?.find((item) => item.name.type === "user" && !item.name.profile);
  if (!layer) throw new Error("未找到 CS 用户配置层，无法安全编辑 MCP。");
  const config = layer.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("用户配置格式无效。");
  const servers = config.mcp_servers ?? {};
  if (typeof servers !== "object" || !servers || Array.isArray(servers)) throw new Error("MCP 配置格式无效。");
  for (const server of Object.values(servers)) {
    if (!server || typeof server !== "object" || Array.isArray(server)) throw new Error("MCP 服务器配置格式无效。");
  }
  return { version: layer.version, servers: servers as Record<string, McpConfig> };
}

export function mcpKey(name: string) {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) throw new Error("服务器名称只能使用 1–64 个字母、数字、下划线或连字符。");
  return `mcp_servers.${name}`;
}

export function bearerEnv(name: string) {
  mcpKey(name);
  return `CS_MCP_${Array.from(name, (char) => char.charCodeAt(0).toString(16).toUpperCase()).join("")}`;
}
