import { useCallback } from "react";
import type { FuzzyFileSearchResult } from "../../generated/app-server/FuzzyFileSearchResult";
import type { FsReadDirectoryEntry } from "../../generated/app-server/v2/FsReadDirectoryEntry";
import type { FsChangedNotification } from "../../generated/app-server/v2/FsChangedNotification";
import type { AppServerClient } from "./appServerClient";

type EnsureConnected = () => Promise<AppServerClient>;
export type DisposeWorkspaceWatch = () => void | Promise<void>;
export type WatchWorkspacePath = (
  path: string,
  onChanged: (changedPaths: string[]) => void,
) => Promise<DisposeWorkspaceWatch>;

let nextWatchId = 1;

export function useWorkspaceFiles(
  ensureConnected: EnsureConnected,
  projectCwd: string | null,
) {
  const searchFiles = useCallback(async (query: string): Promise<FuzzyFileSearchResult[]> => {
    if (!projectCwd) return [];
    const client = await ensureConnected();
    if (!query.trim()) {
      const response = await client.readDirectory({ path: projectCwd });
      return response.entries
        .filter((entry) => entry.isDirectory || entry.isFile)
        .sort((left, right) => Number(right.isDirectory) - Number(left.isDirectory)
          || left.fileName.localeCompare(right.fileName))
        .slice(0, 30)
        .map((entry) => ({
          root: projectCwd,
          path: entry.fileName,
          match_type: entry.isDirectory ? "directory" as const : "file" as const,
          file_name: entry.fileName,
          score: 0,
          indices: null,
        }));
    }
    const response = await client.fuzzyFileSearch({
      query: query.trim(),
      roots: [projectCwd],
      cancellationToken: "codex-shell-composer-file-search",
    });
    return response.files.slice(0, 12);
  }, [ensureConnected, projectCwd]);

  const readWorkspaceDirectory = useCallback(async (path: string): Promise<FsReadDirectoryEntry[]> => {
    const client = await ensureConnected();
    return (await client.readDirectory({ path })).entries;
  }, [ensureConnected]);

  const readWorkspaceFile = useCallback(async (path: string) => {
    const client = await ensureConnected();
    return (await client.readFile({ path })).dataBase64;
  }, [ensureConnected]);

  const watchWorkspacePath = useCallback<WatchWorkspacePath>(async (path, onChanged) => {
    const client = await ensureConnected();
    const watchId = `codex-shell-workspace-${Date.now()}-${nextWatchId++}`;
    let disposed = false;
    const disposeNotification = client.onNotification("fs/changed", (params) => {
      const notification = params as FsChangedNotification;
      if (!disposed && notification.watchId === watchId) {
        onChanged(notification.changedPaths.map(String));
      }
    });
    try {
      await client.watchPath({ watchId, path });
    } catch (error) {
      disposeNotification();
      throw error;
    }
    return async () => {
      if (disposed) return;
      disposed = true;
      disposeNotification();
      if (client.connectionStatus === "ready") {
        await client.unwatchPath({ watchId }).catch(() => undefined);
      }
    };
  }, [ensureConnected]);

  return { searchFiles, readWorkspaceDirectory, readWorkspaceFile, watchWorkspacePath };
}
