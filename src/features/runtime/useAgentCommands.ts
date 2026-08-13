import { useCallback } from "react";
import type { McpServerStatus } from "../../generated/app-server/v2/McpServerStatus";
import type { ResourceContent } from "../../generated/app-server/ResourceContent";
import type { Model } from "../../generated/app-server/v2/Model";
import type { ModelProviderCapabilitiesReadResponse } from "../../generated/app-server/v2/ModelProviderCapabilitiesReadResponse";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import type { ThreadGoal } from "../../generated/app-server/v2/ThreadGoal";
import { assertModelVisibleInput } from "../../shared/modelVisibleInput";
import type { AppServerClient } from "./appServerClient";
import type { RunningTurnKind } from "./useRunningTurns";

type EnsureConnected = () => Promise<AppServerClient>;
type EnsureActiveThread = () => Promise<{ client: AppServerClient; threadId: string }>;

export function useAgentCommands(
  ensureConnected: EnsureConnected,
  ensureActiveThread: EnsureActiveThread,
  currentThreadId: () => string | null,
  projectCwd: string | null,
  markThreadRunning: (threadId: string, turnId: string | null, kind: RunningTurnKind) => void,
  markThreadStopped: (threadId: string) => void,
) {
  const listSkills = useCallback(async (forceReload = false): Promise<SkillMetadata[]> => {
    const client = await ensureConnected();
    const response = await client.listSkills({
      cwds: projectCwd ? [projectCwd] : [],
      forceReload,
    });
    return response.data.flatMap((entry) => entry.skills).filter((skill) => skill.enabled);
  }, [ensureConnected, projectCwd]);

  const listMcpServers = useCallback(async (): Promise<McpServerStatus[]> => {
    const client = await ensureConnected();
    const response = await client.listMcpServers({
      threadId: currentThreadId(),
      detail: "full",
      limit: 100,
    });
    return response.data;
  }, [currentThreadId, ensureConnected]);

  const loginMcpServer = useCallback(async (name: string) => {
    const client = await ensureConnected();
    return (await client.loginMcpServer({ name, threadId: currentThreadId() })).authorizationUrl;
  }, [currentThreadId, ensureConnected]);

  const reloadMcpServers = useCallback(async () => {
    const client = await ensureConnected();
    await client.reloadMcpServers();
  }, [ensureConnected]);

  const readMcpResource = useCallback(async (server: string, uri: string): Promise<ResourceContent[]> => {
    const client = await ensureConnected();
    return (await client.readMcpResource({ server, uri, threadId: currentThreadId() })).contents;
  }, [currentThreadId, ensureConnected]);

  const compactThread = useCallback(async () => {
    const { client, threadId } = await ensureActiveThread();
    markThreadRunning(threadId, null, "compact");
    try {
      await client.compactThread({ threadId });
    } catch (error) {
      markThreadStopped(threadId);
      throw error;
    }
  }, [ensureActiveThread, markThreadRunning, markThreadStopped]);

  const getThreadGoal = useCallback(async (): Promise<ThreadGoal | null> => {
    const { client, threadId } = await ensureActiveThread();
    return (await client.getThreadGoal({ threadId })).goal;
  }, [ensureActiveThread]);

  const setThreadGoal = useCallback(async (objective: string): Promise<ThreadGoal> => {
    assertModelVisibleInput(objective, "长期目标");
    const { client, threadId } = await ensureActiveThread();
    return (await client.setThreadGoal({ threadId, objective, status: "active" })).goal;
  }, [ensureActiveThread]);

  const clearThreadGoal = useCallback(async () => {
    const { client, threadId } = await ensureActiveThread();
    return (await client.clearThreadGoal({ threadId })).cleared;
  }, [ensureActiveThread]);

  const listModels = useCallback(async (): Promise<Model[]> => {
    const client = await ensureConnected();
    const models: Model[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 10; page += 1) {
      const response = await client.listModels({ cursor, limit: 100 });
      models.push(...response.data);
      cursor = response.nextCursor;
      if (!cursor) break;
    }
    return models;
  }, [ensureConnected]);

  const readModelProviderCapabilities = useCallback(async (): Promise<ModelProviderCapabilitiesReadResponse> => {
    const client = await ensureConnected();
    return client.readModelProviderCapabilities();
  }, [ensureConnected]);

  return {
    listSkills,
    listMcpServers,
    loginMcpServer,
    reloadMcpServers,
    readMcpResource,
    compactThread,
    getThreadGoal,
    setThreadGoal,
    clearThreadGoal,
    listModels,
    readModelProviderCapabilities,
  };
}
