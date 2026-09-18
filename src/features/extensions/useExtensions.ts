import { useCallback } from "react";
import type { PluginReadParams } from "../../generated/app-server/v2/PluginReadParams";
import type { PluginInstallParams } from "../../generated/app-server/v2/PluginInstallParams";
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
  const listPlugins = useCallback(async () => (await ensureConnected()).extensions.listPlugins(), [ensureConnected]);
  const readPlugin = useCallback(async (params: PluginReadParams) => (await ensureConnected()).extensions.readPlugin(params), [ensureConnected]);
  const installPlugin = useCallback(async (params: PluginInstallParams) => (await ensureConnected()).extensions.installPlugin(params), [ensureConnected]);
  const uninstallPlugin = useCallback(async (id: string) => (await ensureConnected()).extensions.uninstallPlugin(id), [ensureConnected]);
  const addMarketplace = useCallback(async (source: string) => (await ensureConnected()).extensions.addMarketplace(source), [ensureConnected]);
  const readSkillContent = useCallback(async (path: string) => {
    const response = await (await ensureConnected()).readFile({ path });
    return new TextDecoder().decode(Uint8Array.from(atob(response.dataBase64), (character) => character.charCodeAt(0)));
  }, [ensureConnected]);
  const setSkillEnabled = useCallback(async (path: string, enabled: boolean) =>
    (await (await ensureConnected()).writeSkillConfig({ path, enabled })).effectiveEnabled, [ensureConnected]);
  return { readMcpConfig, writeMcpConfig, listPlugins, readPlugin, installPlugin, uninstallPlugin, addMarketplace, readSkillContent, setSkillEnabled };
}
