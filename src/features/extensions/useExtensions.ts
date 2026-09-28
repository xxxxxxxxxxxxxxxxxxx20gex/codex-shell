import { useCallback } from "react";
import type { AppServerClient } from "../runtime/appServerClient";
import { mcpKey, userMcpConfig, type McpConfig } from "./mcpConfig";

export function useExtensions(ensureConnected: () => Promise<AppServerClient>) {
  const readMcpConfig = useCallback(async () => userMcpConfig(await (await ensureConnected()).extensions.readConfig()), [ensureConnected]);
  const writeMcpConfig = useCallback(async (name: string, value: McpConfig | null, version: string) => {
    const client = await ensureConnected();
    const result = await client.extensions.writeConfig({ expectedVersion: version, edits: [{ keyPath: mcpKey(name), value, mergeStrategy: "replace" }] });
    try { await client.reloadMcpServers(); }
    catch { throw new Error("配置已保存，但 MCP 重新加载失败，请刷新状态或重启运行环境。"); }
    if (result.status === "okOverridden") throw new Error("配置已保存，但被上层配置覆盖，请检查项目或管理员设置。");
  }, [ensureConnected]);
  const readSkillContent = useCallback(async (path: string) => {
    const response = await (await ensureConnected()).readFile({ path });
    return new TextDecoder().decode(Uint8Array.from(atob(response.dataBase64), (character) => character.charCodeAt(0)));
  }, [ensureConnected]);
  const setSkillEnabled = useCallback(async (path: string, enabled: boolean) =>
    (await (await ensureConnected()).writeSkillConfig({ path, enabled })).effectiveEnabled, [ensureConnected]);
  return { readMcpConfig, writeMcpConfig, readSkillContent, setSkillEnabled };
}
