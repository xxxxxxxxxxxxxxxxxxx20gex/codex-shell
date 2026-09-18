// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { PluginManagementPage } from "./PluginManagementPage";
import { PluginDetailView } from "./PluginDetailView";
import type { PluginDetail } from "../../generated/app-server/v2/PluginDetail";
import type { useExtensions } from "../extensions/useExtensions";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => "C:/cs/office") }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const skill = { name: "cs-pdf", description: "处理 PDF", shortDescription: null, interface: null, path: "C:/cs/pdf/SKILL.md", enabled: true };
const detail = { summary: { id: "cs-office@cs-curated", name: "cs-office", installed: true }, skills: [skill], apps: [], hooks: [], mcpServers: [] } as unknown as PluginDetail;
const extensions = (overrides: object) => ({ readSkillContent: vi.fn(async () => "---\nname: hidden-metadata\n---\n# 完整内容\n\n办公指令"), ...overrides }) as unknown as ReturnType<typeof useExtensions>;

it("previews bundled skills without registering or installing a marketplace", async () => {
  const readPlugin = vi.fn(async () => ({ plugin: { ...detail, summary: { ...detail.summary, installed: false } } }));
  const addMarketplace = vi.fn();
  const installPlugin = vi.fn();
  render(<PluginManagementPage extensions={extensions({ listPlugins: async () => ({ marketplaces: [], marketplaceLoadErrors: [] }), readPlugin, addMarketplace, installPlugin })} revision={0} onClose={vi.fn()} onChanged={vi.fn()} />);
  await screen.findByText("暂无已安装插件。");
  fireEvent.click(screen.getByText("详情"));
  await screen.findByText("cs-pdf");
  expect(invoke).toHaveBeenCalledWith("prepare_builtin_office_plugin");
  expect(readPlugin).toHaveBeenCalledWith({ marketplacePath: "C:/cs/office/.agents/plugins/marketplace.json", pluginName: "cs-office" });
  expect((screen.getByRole("switch") as HTMLInputElement).disabled).toBe(true);
  expect(addMarketplace).not.toHaveBeenCalled();
  expect(installPlugin).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /cs-pdf/ }));
  expect(await screen.findByText("办公指令")).toBeTruthy();
  expect(screen.queryByText("hidden-metadata")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "关闭技能详情" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("uses the Core effective state and preserves the previous state on failure", async () => {
  const setSkillEnabled = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("写入失败"));
  const changed = vi.fn();
  render(<PluginDetailView detail={detail} extensions={extensions({ setSkillEnabled })} onClose={vi.fn()} onChanged={changed} />);
  fireEvent.click(screen.getByRole("switch"));
  await screen.findByText("有效状态受上层配置限制。");
  expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole("switch"));
  await waitFor(() => expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(false));
  expect(setSkillEnabled).toHaveBeenCalledWith(skill.path, false);
  fireEvent.click(screen.getByRole("switch"));
  await screen.findByText("写入失败");
  expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(false);
  expect(changed).toHaveBeenCalledTimes(2);
});

it("reports skill file read errors without presenting empty content as success", async () => {
  render(<PluginDetailView detail={detail} extensions={extensions({ readSkillContent: async () => { throw new Error("文件不可读"); } })} onClose={vi.fn()} onChanged={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: /cs-pdf/ }));
  expect(await screen.findByText("文件不可读")).toBeTruthy();
});
