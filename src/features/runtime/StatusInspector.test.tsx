// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeNoticeStore } from "./runtimeNoticeStore";
import { StatusInspector } from "./StatusInspector";

afterEach(cleanup);

describe("StatusInspector", () => {
  it("starts the preferred elevated Windows sandbox setup", () => {
    const onSetupWindowsSandbox = vi.fn(async () => true);
    render(
      <StatusInspector
        turnCount={0}
        threadId={null}
        workspacePath="C:\\workspace"
        workspaceKind="custom"
        usingManagedWorkspace={false}
        canUseDefaultWorkspace={false}
        codexHome="C:\\Users\\example\\.codex-shell"
        codexHomeDisabled={false}
        noticeStore={new RuntimeNoticeStore()}
        windowsSandboxReadiness="notConfigured"
        onBrowseWorkspace={vi.fn()}
        onUseDefaultWorkspace={vi.fn()}
        onSetupWindowsSandbox={onSetupWindowsSandbox}
        onRestart={vi.fn(async () => undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "使用管理员权限配置" }));

    expect(onSetupWindowsSandbox).toHaveBeenCalledWith("elevated");
  });
});
