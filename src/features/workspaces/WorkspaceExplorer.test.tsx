// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FsReadDirectoryEntry } from "../../generated/app-server/v2/FsReadDirectoryEntry";
import type { DisposeWorkspaceWatch } from "../runtime/useWorkspaceFiles";
import { WorkspaceExplorer } from "./WorkspaceExplorer";

describe("WorkspaceExplorer", () => {
  it("uses one persistent inspector maximize toggle", async () => {
    let maximized = false;
    const onToggleMaximize = vi.fn(() => { maximized = !maximized; });
    render(
      <WorkspaceExplorer
        rootPath="C:\\work"
        maximized={maximized}
        onToggleMaximize={onToggleMaximize}
        onClose={() => undefined}
        readDirectory={vi.fn(async () => [])}
        readFile={vi.fn(async () => "")}
        watchPath={vi.fn(async () => vi.fn())}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "扩大右侧功能区" }));
    expect(onToggleMaximize).toHaveBeenCalledTimes(1);
  });

  it("keeps the close action available after the inspector is maximized", () => {
    const onClose = vi.fn();
    render(
      <WorkspaceExplorer
        rootPath="C:\\work"
        maximized
        onToggleMaximize={() => undefined}
        onClose={onClose}
        readDirectory={vi.fn(async () => [])}
        readFile={vi.fn(async () => "")}
        watchPath={vi.fn(async () => vi.fn())}
      />,
    );

    expect(screen.getByRole("button", { name: "恢复右侧功能区宽度" })).toBeTruthy();
    const closeButtons = screen.getAllByRole("button", { name: "关闭文件浏览器" });
    const closeButton = closeButtons[closeButtons.length - 1];
    expect(closeButton?.getAttribute("aria-label")).toBe("关闭文件浏览器");
    if (closeButton) fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
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
        maximized={false}
        onToggleMaximize={() => undefined}
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
