import { useCallback } from "react";
import type { FuzzyFileSearchResult } from "../../generated/app-server/FuzzyFileSearchResult";
import type { FsReadDirectoryEntry } from "../../generated/app-server/v2/FsReadDirectoryEntry";
import type { AppServerClient } from "./appServerClient";

type EnsureConnected = () => Promise<AppServerClient>;

export function useWorkspaceFiles(
  ensureConnected: EnsureConnected,
  workspacePath: string | null,
) {
  const searchFiles = useCallback(async (query: string): Promise<FuzzyFileSearchResult[]> => {
    if (!workspacePath) return [];
    const client = await ensureConnected();
    if (!query.trim()) {
      const response = await client.readDirectory({ path: workspacePath });
      return response.entries
        .filter((entry) => entry.isDirectory || entry.isFile)
        .sort((left, right) => Number(right.isDirectory) - Number(left.isDirectory)
          || left.fileName.localeCompare(right.fileName))
        .slice(0, 30)
        .map((entry) => ({
          root: workspacePath,
          path: entry.fileName,
          match_type: entry.isDirectory ? "directory" as const : "file" as const,
          file_name: entry.fileName,
          score: 0,
          indices: null,
        }));
    }
    const response = await client.fuzzyFileSearch({
      query: query.trim(),
      roots: [workspacePath],
      cancellationToken: "codex-shell-composer-file-search",
    });
    return response.files.slice(0, 12);
  }, [ensureConnected, workspacePath]);

  const readWorkspaceDirectory = useCallback(async (path: string): Promise<FsReadDirectoryEntry[]> => {
    const client = await ensureConnected();
    return (await client.readDirectory({ path })).entries;
  }, [ensureConnected]);

  const readWorkspaceFile = useCallback(async (path: string) => {
    const client = await ensureConnected();
    return (await client.readFile({ path })).dataBase64;
  }, [ensureConnected]);

  return { searchFiles, readWorkspaceDirectory, readWorkspaceFile };
}
