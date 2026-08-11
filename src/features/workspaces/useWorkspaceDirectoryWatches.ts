import { useEffect } from "react";
import type { DisposeWorkspaceWatch, WatchWorkspacePath } from "../runtime/useWorkspaceFiles";

interface Options {
  directories: ReadonlySet<string>;
  watchPath: WatchWorkspacePath;
  onChanged: (directory: string, changedPaths: string[]) => void;
  onError: (error: unknown) => void;
}

const CHANGE_DEBOUNCE_MS = 180;

export function useWorkspaceDirectoryWatches({ directories, watchPath, onChanged, onError }: Options) {
  useEffect(() => {
    let cancelled = false;
    const disposers = new Set<DisposeWorkspaceWatch>();
    const pendingPaths = new Map<string, Set<string>>();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    function scheduleRefresh(directory: string, changedPaths: string[]) {
      const paths = pendingPaths.get(directory) ?? new Set<string>();
      changedPaths.forEach((path) => paths.add(path));
      pendingPaths.set(directory, paths);
      const currentTimer = timers.get(directory);
      if (currentTimer) clearTimeout(currentTimer);
      timers.set(directory, setTimeout(() => {
        timers.delete(directory);
        pendingPaths.delete(directory);
        if (!cancelled) onChanged(directory, [...paths]);
      }, CHANGE_DEBOUNCE_MS));
    }

    directories.forEach((directory) => {
      void watchPath(directory, (changedPaths) => scheduleRefresh(directory, changedPaths))
        .then((dispose) => {
          if (cancelled) void dispose();
          else disposers.add(dispose);
        })
        .catch((error) => {
          if (!cancelled) onError(error);
        });
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      timers.clear();
      pendingPaths.clear();
      disposers.forEach((dispose) => void dispose());
      disposers.clear();
    };
  }, [directories, onChanged, onError, watchPath]);
}
