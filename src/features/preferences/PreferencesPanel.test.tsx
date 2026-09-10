// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { check } from "@tauri-apps/plugin-updater";
import type { ProviderSettings } from "../models/types";
import { RuntimeLogStore } from "../runtime/runtimeLogStore";
import { RuntimeNoticeStore } from "../runtime/runtimeNoticeStore";
import { PreferencesPanel } from "./PreferencesPanel";

vi.mock("@tauri-apps/plugin-updater", () => ({ check: vi.fn(async () => null) }));

afterEach(cleanup);

const providerSettings: ProviderSettings = {
  schemaVersion: 2,
  activeChannelId: "openai-1",
  channels: [{
    id: "openai-1",
    vendor: "openai",
    name: "OpenAI 官方",
    baseUrl: "https://api.openai.com/v1",
    catalog: { kind: "vendorDefault" },
    conversation: { modelId: "gpt-test", reasoningEffort: null, reasoningSummary: null, verbosity: null, serviceTier: "default" },
  }],
};

function panelProps() {
  return {
    settings: { customInstructions: "", theme: "dark" as const },
    providerSettings,
    onSaveProviderSettings: vi.fn(async () => undefined),
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

  it("checks for updates from runtime settings", async () => {
    render(<PreferencesPanel {...panelProps()} onSave={async () => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "运行环境" }));
    fireEvent.click(screen.getByRole("button", { name: "检查并更新" }));

    await waitFor(() => expect(check).toHaveBeenCalled());
    expect(screen.getByText("当前已是最新版本")).toBeTruthy();
  });

  it("limits model channels to their own section without a shared save button", () => {
    render(<PreferencesPanel {...panelProps()} initialSection="providers" onSave={async () => undefined} />);

    expect(screen.getByRole("button", { name: "模型渠道" }).classList.contains("active")).toBe(true);
    expect(screen.getByText("OpenAI")).toBeTruthy();
    expect(screen.getByText("DeepSeek")).toBeTruthy();
    expect(screen.getByText("OpenAI 官方")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
    expect(screen.getByRole("button", { name: "关闭" })).toBeTruthy();
  });

  it("opens directly on the requested section", () => {
    render(<PreferencesPanel {...panelProps()} initialSection="diagnostics" onSave={async () => undefined} />);

    expect(screen.getByRole("button", { name: "诊断" }).classList.contains("active")).toBe(true);
    expect(screen.getByRole("region", { name: "app-server 实时日志" })).toBeTruthy();
  });
});
