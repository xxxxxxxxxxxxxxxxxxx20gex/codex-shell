// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FsReadDirectoryEntry } from "../../generated/app-server/v2/FsReadDirectoryEntry";
import type { DisposeWorkspaceWatch } from "../runtime/useWorkspaceFiles";
import { WorkspaceExplorer } from "./WorkspaceExplorer";

describe("WorkspaceExplorer", () => {
  it("supports resizing the right drawer with explicit size controls", async () => {
    const view = render(
      <WorkspaceExplorer
        rootPath="C:\\work"
        onClose={() => undefined}
        readDirectory={vi.fn(async () => [])}
        readFile={vi.fn(async () => "")}
        watchPath={vi.fn(async () => vi.fn())}
      />,
    );

    const drawer = view.container.querySelector<HTMLElement>(".workspace-explorer-drawer");
    const initialWidth = Math.max(420, Math.min(1200, window.innerWidth - 320));
    expect(drawer?.style.getPropertyValue("--explorer-width")).toBe(`${initialWidth}px`);
    fireEvent.click(screen.getByRole("button", { name: "缩小到最小宽度" }));
    expect(drawer?.style.getPropertyValue("--explorer-width")).toBe("420px");
    fireEvent.click(screen.getByRole("button", { name: "扩大到最大宽度" }));
    expect(drawer?.style.getPropertyValue("--explorer-width")).toBe(`${initialWidth}px`);
  });

  it("watches expanded folders, refreshes changed files, and releases watches", async () => {
    const rootPath = "C:\\work";
    const srcPath = "C:\\work\\src";
    const filePath = "C:\\work\\README.md";
    const rootEntries: FsReadDirectoryEntry[] = [
      { fileName: "src", isDirectory: true, isFile: false },
      { fileName: "README.md", isDirectory: false, isFile: true },
    ];
    const readDirectory = vi.fn(async (path: string) => path === rootPath ? [...rootEntries] : []);
    const readFile = vi.fn(async () => "aGVsbG8=");
    const callbacks = new Map<string, (paths: string[]) => void>();
    const disposers = new Map<string, ReturnType<typeof vi.fn>>();
    const watchPath = vi.fn(async (path: string, onChanged: (paths: string[]) => void) => {
      const dispose = vi.fn<DisposeWorkspaceWatch>();
      callbacks.set(path, onChanged);
      disposers.set(path, dispose);
      return dispose;
    });
    const view = render(
      <WorkspaceExplorer
        rootPath={rootPath}
        onClose={() => undefined}
        readDirectory={readDirectory}
        readFile={readFile}
        watchPath={watchPath}
      />,
    );

    await waitFor(() => expect(watchPath).toHaveBeenCalledWith(rootPath, expect.any(Function)));
    fireEvent.click(await screen.findByRole("button", { name: /src/ }));
    await waitFor(() => expect(watchPath).toHaveBeenCalledWith(srcPath, expect.any(Function)));

    fireEvent.click(screen.getByRole("button", { name: /README\.md/ }));
    await waitFor(() => expect(readFile).toHaveBeenCalledTimes(1));
    callbacks.get(rootPath)?.([filePath]);
    await waitFor(() => expect(readDirectory.mock.calls.filter(([path]) => path === rootPath)).toHaveLength(2));
    await waitFor(() => expect(readFile).toHaveBeenCalledTimes(2));

    view.unmount();
    await waitFor(() => {
      expect(disposers.get(rootPath)).toHaveBeenCalled();
      expect(disposers.get(srcPath)).toHaveBeenCalled();
    });
  });
});
