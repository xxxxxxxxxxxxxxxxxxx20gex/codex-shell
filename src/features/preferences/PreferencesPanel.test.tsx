// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openUrl } from "@tauri-apps/plugin-opener";
import { RuntimeLogStore } from "../runtime/runtimeLogStore";
import { RuntimeNoticeStore } from "../runtime/runtimeNoticeStore";
import { PreferencesPanel } from "./PreferencesPanel";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn(async () => undefined) }));

afterEach(cleanup);

function panelProps() {
  return {
    settings: { customInstructions: "", theme: "dark" as const },
    codexHome: "C:\\Users\\example\\.codex-shell",
    codexHomeDisabled: false,
    windowsSandboxReadiness: "notConfigured" as const,
    noticeStore: new RuntimeNoticeStore(),
    logStore: new RuntimeLogStore(),
    onSetupWindowsSandbox: vi.fn(async () => true),
    onRestart: vi.fn(async () => undefined),
    onClose: vi.fn(),
  };
}

describe("PreferencesPanel", () => {
  it("keeps general settings limited to personalization and appearance", async () => {
    const onSave = vi.fn(async () => undefined);
    render(<PreferencesPanel {...panelProps()} onSave={onSave} />);

    expect(screen.getByRole("button", { name: "个性化提示词" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "外观" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "运行环境" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "诊断" })).toBeTruthy();
    expect(screen.queryByText("Base URL")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/回答时优先给出结论/), {
      target: { value: "  先给结论  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      customInstructions: "先给结论",
      theme: "dark",
    }));
  });

  it("switches appearance without mixing model settings into the page", () => {
    render(<PreferencesPanel {...panelProps()} onSave={async () => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "外观" }));
    fireEvent.click(screen.getByRole("radio", { name: /浅色/ }));
    expect(screen.getByRole("radio", { name: /浅色/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("moves runtime configuration and diagnostics into dedicated sections", () => {
    const props = panelProps();
    render(<PreferencesPanel {...props} onSave={async () => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "运行环境" }));
    expect(screen.getByText("Windows Sandbox")).toBeTruthy();
    expect(screen.getByText("CODEX_HOME")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "使用管理员权限配置" }));
    expect(props.onSetupWindowsSandbox).toHaveBeenCalledWith("elevated");

    fireEvent.click(screen.getByRole("button", { name: "诊断" }));
    expect(screen.getByText("运行提示")).toBeTruthy();
    expect(screen.getByRole("region", { name: "app-server 实时日志" })).toBeTruthy();
  });

  it("opens the latest release page from runtime settings", async () => {
    render(<PreferencesPanel {...panelProps()} onSave={async () => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "运行环境" }));
    fireEvent.click(screen.getByRole("button", { name: "检查更新" }));

    await waitFor(() => expect(openUrl).toHaveBeenCalledWith(
      "https://github.com/xxxxxxxxxxxxxxxxxxx20gex/codex-shell/releases/latest",
    ));
  });

  it("opens directly on the requested section", () => {
    render(<PreferencesPanel {...panelProps()} initialSection="diagnostics" onSave={async () => undefined} />);

    expect(screen.getByRole("button", { name: "诊断" }).classList.contains("active")).toBe(true);
    expect(screen.getByRole("region", { name: "app-server 实时日志" })).toBeTruthy();
  });
});
