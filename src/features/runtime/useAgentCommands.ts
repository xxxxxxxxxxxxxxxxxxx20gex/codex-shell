import { useCallback } from "react";
import type { McpServerStatus } from "../../generated/app-server/v2/McpServerStatus";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import type { ThreadGoal } from "../../generated/app-server/v2/ThreadGoal";
import type { AppServerClient } from "./appServerClient";

type EnsureConnected = () => Promise<AppServerClient>;

function requireThreadId(currentThreadId: () => string | null) {
  const threadId = currentThreadId();
  if (!threadId) throw new Error("请先发送一条消息创建 Session");
  return threadId;
}

export function useAgentCommands(
  ensureConnected: EnsureConnected,
  currentThreadId: () => string | null,
  workspacePath: string | null,
) {
  const listSkills = useCallback(async (forceReload = false): Promise<SkillMetadata[]> => {
    const client = await ensureConnected();
    const response = await client.listSkills({
      cwds: workspacePath ? [workspacePath] : [],
      forceReload,
    });
    return response.data.flatMap((entry) => entry.skills).filter((skill) => skill.enabled);
  }, [ensureConnected, workspacePath]);

  const listMcpServers = useCallback(async (): Promise<McpServerStatus[]> => {
    const client = await ensureConnected();
    const response = await client.listMcpServers({
      threadId: currentThreadId(),
      detail: "toolsAndAuthOnly",
      limit: 100,
    });
    return response.data;
  }, [currentThreadId, ensureConnected]);

  const compactThread = useCallback(async () => {
    const threadId = requireThreadId(currentThreadId);
    const client = await ensureConnected();
    await client.compactThread({ threadId });
  }, [currentThreadId, ensureConnected]);

  const getThreadGoal = useCallback(async (): Promise<ThreadGoal | null> => {
    const threadId = requireThreadId(currentThreadId);
    const client = await ensureConnected();
    return (await client.getThreadGoal({ threadId })).goal;
  }, [currentThreadId, ensureConnected]);

  const setThreadGoal = useCallback(async (objective: string): Promise<ThreadGoal> => {
    const threadId = requireThreadId(currentThreadId);
    const client = await ensureConnected();
    return (await client.setThreadGoal({ threadId, objective, status: "active" })).goal;
  }, [currentThreadId, ensureConnected]);

  const clearThreadGoal = useCallback(async () => {
    const threadId = requireThreadId(currentThreadId);
    const client = await ensureConnected();
    return (await client.clearThreadGoal({ threadId })).cleared;
  }, [currentThreadId, ensureConnected]);

  return { listSkills, listMcpServers, compactThread, getThreadGoal, setThreadGoal, clearThreadGoal };
}
