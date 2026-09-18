// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { McpConfigPanel } from "./McpConfigPanel";
import { SkillManagementPage } from "./SkillManagementPage";
import { PluginManagementPage } from "./PluginManagementPage";
import { McpStatusPanel } from "./McpStatusPanel";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import type { PluginSummary } from "../../generated/app-server/v2/PluginSummary";
import type { useExtensions } from "../extensions/useExtensions";
import { bearerEnv, type McpConfig } from "../extensions/mcpConfig";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => undefined) }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("closes MCP on Escape or outside pointer input and releases listeners", () => {
  const close = vi.fn();
  const view = render(<McpStatusPanel loadServers={async () => []} loginServer={vi.fn()} reloadServers={vi.fn()} readResource={vi.fn()} onClose={close} />);
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.pointerDown(document.body);
  expect(close).toHaveBeenCalledTimes(2);
  view.unmount();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(2);
});

it("never serializes the entered bearer token into MCP config and clears the input", async () => {
  const write = vi.fn(async () => undefined);
  render(<McpConfigPanel read={async () => ({ version: "v1", servers: {} })} write={write} />);
  await waitFor(() => expect((screen.getByLabelText("服务器名称") as HTMLInputElement).disabled).toBe(false));
  fireEvent.change(screen.getByLabelText("服务器名称"), { target: { value: "docs" } });
  fireEvent.change(screen.getByLabelText("连接方式"), { target: { value: "http" } });
  fireEvent.change(screen.getByLabelText("HTTP 地址"), { target: { value: "https://example.com/mcp" } });
  fireEvent.change(screen.getByLabelText(/Bearer Token/), { target: { value: "test-only-secret" } });
  fireEvent.click(screen.getByText("添加 MCP"));
  await waitFor(() => expect(invoke).toHaveBeenCalledWith("save_mcp_secret", { name: "docs", secret: "test-only-secret" }));
  expect(write).toHaveBeenCalledWith("docs", { enabled: true, url: "https://example.com/mcp", bearer_token_env_var: bearerEnv("docs") }, "v1");
  expect(JSON.stringify(write.mock.calls)).not.toContain("test-only-secret");
  expect((screen.queryByLabelText(/Bearer Token/) as HTMLInputElement | null)?.value ?? "").toBe("");
  expect((await screen.findByRole("status")).textContent).toContain("重启");
});

it("preserves unedited MCP tool policy and reports a version conflict without saving credentials", async () => {
  const original: McpConfig = { command: "node", args: ["old.js"], enabled: false, disabled_tools: ["delete"], startup_timeout_sec: 30 };
  const write = vi.fn(async () => { throw new Error("配置版本冲突"); });
  render(<McpConfigPanel read={async () => ({ version: "v-old", servers: { local: original } })} write={write} />);
  fireEvent.click(await screen.findByText("编辑"));
  fireEvent.change(screen.getByLabelText("参数（JSON 数组）"), { target: { value: '["new.js"]' } });
  fireEvent.click(screen.getByText("保存修改"));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "配置版本冲突");
  expect(write).toHaveBeenCalledWith("local", { ...original, args: ["new.js"], env_vars: [] }, "v-old");
  expect(invoke).not.toHaveBeenCalled();
});

it("only offers uninstall for CS-owned user skills, and reports dialog errors", async () => {
  const base = { name: "demo", description: "demo", enabled: true, scope: "user", pluginId: null } as const;
  const skills: SkillMetadata[] = [
    { ...base, path: "C:/cs/skills/demo/SKILL.md" },
    { ...base, name: "project", scope: "repo", path: "C:/repo/.agents/skills/demo/SKILL.md" },
    { ...base, name: "other-user", path: "C:/official/skills/demo/SKILL.md" },
    { ...base, name: "bundled", path: "C:/cs/skills/bundled/SKILL.md", pluginId: "p" },
  ];
  render(<SkillManagementPage codexHome="C:/cs" revision={0} loadSkills={async () => skills} setEnabled={vi.fn()} onClose={vi.fn()} />);
  expect(await screen.findAllByText("卸载")).toHaveLength(1);
  vi.mocked(open).mockRejectedValueOnce(new Error("目录选择失败"));
  fireEvent.click(screen.getByText("从目录安装"));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "目录选择失败");
});

it("installs the bundled image skill disabled by default", async () => {
  const setEnabled = vi.fn(async () => false);
  vi.mocked(invoke).mockResolvedValueOnce("C:/cs/skills/image-gen/SKILL.md");
  render(<SkillManagementPage codexHome="C:/cs" revision={0} loadSkills={async () => []} setEnabled={setEnabled} onClose={vi.fn()} />);
  const imageCard = screen.getByText("兔子生图").closest("article")!;
  fireEvent.click(within(imageCard).getByText("安装"));
  await waitFor(() => expect(setEnabled).toHaveBeenCalledWith("C:/cs/skills/image-gen/SKILL.md", false));
  expect(screen.queryByRole("status")).toBeNull();
});

it("hides uninstalled marketplace entries and retains installed plugin removal", async () => {
  const plugin = { id: "demo@local", name: "已装插件", installed: true, enabled: true, installPolicy: "AVAILABLE", interface: null } as PluginSummary;
  const uninstallPlugin = vi.fn(async () => ({}));
  const extensions = { listPlugins: async () => ({ marketplaces: [{ name: "local", path: "C:/market.json", interface: null, plugins: [plugin, { ...plugin, id: "hidden", name: "Game Studio", installed: false }] }], marketplaceLoadErrors: [] }), uninstallPlugin } as unknown as ReturnType<typeof useExtensions>;
  const changed = vi.fn();
  render(<PluginManagementPage extensions={extensions} revision={0} onChanged={changed} onClose={vi.fn()} />);
  await screen.findByText("已装插件");
  expect(screen.queryByText("Game Studio")).toBeNull();
  expect(screen.queryByText("添加来源")).toBeNull();
  expect(screen.getAllByText("安装")).toHaveLength(1);
  fireEvent.click(screen.getByText("卸载"));
  await waitFor(() => expect(uninstallPlugin).toHaveBeenCalledWith("demo@local"));
  expect(changed).toHaveBeenCalledOnce();
});

it("shows the curated CS Office plugin without advertising upstream plugins", async () => {
  const extensions = { listPlugins: async () => ({ marketplaces: [], marketplaceLoadErrors: [] }) } as unknown as ReturnType<typeof useExtensions>;
  render(<PluginManagementPage extensions={extensions} revision={0} onChanged={vi.fn()} onClose={vi.fn()} />);
  await waitFor(() => expect((screen.getByText("安装") as HTMLButtonElement).disabled).toBe(false));
  expect(screen.getByText("CS Office")).toBeTruthy();
  expect(screen.getByText("安装")).toBeTruthy();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("materializes and installs CS Office through the Core plugin APIs", async () => {
  const plugin = { id: "cs-office@cs-curated", name: "cs-office", installed: false, enabled: false, installPolicy: "AVAILABLE" } as PluginSummary;
  const marketplace = { name: "cs-curated", path: "C:/cs/marketplace.json", interface: null, plugins: [plugin] };
  const listPlugins = vi.fn()
    .mockResolvedValueOnce({ marketplaces: [], marketplaceLoadErrors: [] })
    .mockResolvedValueOnce({ marketplaces: [], marketplaceLoadErrors: [] })
    .mockResolvedValue({ marketplaces: [marketplace], marketplaceLoadErrors: [] });
  const addMarketplace = vi.fn(async () => ({}));
  const installPlugin = vi.fn(async () => ({}));
  vi.mocked(invoke).mockResolvedValueOnce("C:/cs/office-marketplace-0.1.0");
  const extensions = { listPlugins, addMarketplace, installPlugin } as unknown as ReturnType<typeof useExtensions>;
  render(<PluginManagementPage extensions={extensions} revision={0} onChanged={vi.fn()} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByText("安装"));
  await waitFor(() => expect(installPlugin).toHaveBeenCalledWith({ marketplacePath: "C:/cs/marketplace.json", pluginName: "cs-office" }));
  expect(invoke).toHaveBeenCalledWith("prepare_builtin_office_plugin");
  expect(addMarketplace).toHaveBeenCalledWith("C:/cs/office-marketplace-0.1.0");
  expect(screen.queryByRole("status")).toBeNull();
});

it("retains installed plugins and reports uninstall failure without signaling a change", async () => {
  const plugin = { id: "demo", name: "已有插件", installed: true, enabled: true, installPolicy: "AVAILABLE" } as PluginSummary;
  const extensions = { listPlugins: async () => ({ marketplaces: [{ name: "local", path: "C:/market.json", plugins: [plugin] }], marketplaceLoadErrors: [] }), uninstallPlugin: async () => { throw new Error("卸载失败"); } } as unknown as ReturnType<typeof useExtensions>;
  const changed = vi.fn();
  render(<PluginManagementPage extensions={extensions} revision={0} onChanged={changed} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByText("卸载"));
  expect((await screen.findByRole("alert")).textContent).toBe("卸载失败");
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByText("已有插件")).toBeTruthy();
});

it("keeps the built-in skill in its original group through install and uninstall", async () => {
  let installed = false;
  const image = { name: "image-gen", description: "生图", path: "C:\\CS\\skills\\image-gen\\SKILL.md", enabled: false, scope: "user", pluginId: null } as SkillMetadata;
  vi.mocked(invoke).mockImplementation(async (command) => { installed = command === "install_builtin_skill"; return image.path; });
  render(<SkillManagementPage codexHome="C:/cs" revision={0} loadSkills={async () => installed ? [image] : []} setEnabled={async () => false} onClose={vi.fn()} />);
  const group = screen.getByRole("region", { name: "CS 内置" });
  fireEvent.click(within(group).getByText("兔子生图").closest("article")!.querySelector("button")!);
  await within(group).findByText("卸载");
  expect(within(group).getByText("兔子生图")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "个人" })).toBeNull();
  fireEvent.change(screen.getByPlaceholderText("搜索技能"), { target: { value: "兔子" } });
  expect(within(group).getByText("卸载")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(within(group).getByText("卸载"));
  await within(group).findByText("安装");
  expect(within(group).getByText("兔子生图")).toBeTruthy();
});

it("offers CS Docs as a separate built-in skill", async () => {
  let installed = false;
  const docs = { name: "cs-docs", description: "CS 文档", path: "C:\\CS\\skills\\cs-docs\\SKILL.md", enabled: false, scope: "user", pluginId: null } as SkillMetadata;
  vi.mocked(invoke).mockImplementation(async (command) => { installed = command === "install_builtin_cs_docs"; return docs.path; });
  render(<SkillManagementPage codexHome="C:/cs" revision={0} loadSkills={async () => installed ? [docs] : []} setEnabled={async () => false} onClose={vi.fn()} />);
  const group = screen.getByRole("region", { name: "CS 内置" });
  fireEvent.click(within(group).getByText("CS Docs").parentElement!.parentElement!.querySelector("button")!);
  await within(group).findByText("卸载");
  expect(invoke).toHaveBeenCalledWith("install_builtin_cs_docs");
  expect(within(group).getByText("卸载")).toBeTruthy();
});

it("opens an installed Skill row to read its detail and reveal its file", async () => {
  const skill = { name: "demo", description: "演示技能", path: "C:/cs/skills/demo/SKILL.md", enabled: true, scope: "user", pluginId: null } as SkillMetadata;
  const onOpenSkillPath = vi.fn(async () => {});
  render(<SkillManagementPage codexHome="C:/cs" revision={0} loadSkills={async () => [skill]} readSkillContent={async () => "---\nname: demo\n---\n# 技能正文"} onOpenSkillPath={onOpenSkillPath} setEnabled={vi.fn()} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: /demo/ }));
  expect(await screen.findByText("技能正文")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "更多操作" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "在资源管理器中显示" }));
  expect(onOpenSkillPath).toHaveBeenCalledWith(skill.path);
});

it("groups same-named personal, system, and CS plugin skills by provenance", async () => {
  const base = { description: "测试", enabled: true, scope: "user", pluginId: null } as const;
  const skills: SkillMetadata[] = [
    { ...base, name: "image-gen", path: "C:/other/skills/image-gen/SKILL.md" },
    { ...base, name: "system-skill", scope: "system", path: "C:/cs/skills/.system/demo/SKILL.md" },
    { ...base, name: "openai-docs", scope: "system", path: "C:/cs/skills/.system/openai-docs/SKILL.md" },
    { ...base, name: "cs-office:cs-pdf", pluginId: "cs-office@cs-curated", path: "C:/cs/plugins/pdf/SKILL.md" },
  ];
  render(<SkillManagementPage codexHome="C:/cs" revision={0} loadSkills={async () => skills} setEnabled={vi.fn()} onClose={vi.fn()} />);
  await screen.findByText("system-skill");
  expect(within(screen.getByRole("region", { name: "CS 内置" })).getByText("cs-office:cs-pdf")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "CS 内置" })).getByText("CS Docs")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "个人" })).getByText("image-gen")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "系统" })).getByText("system-skill")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "系统" })).getByText("OpenAI 官方文档")).toBeTruthy();
  expect(within(screen.getByRole("region", { name: "系统" })).getByText(/不代表 CS 当前实现/)).toBeTruthy();
});

it("keeps Office first in a single plugin list when installation changes", async () => {
  let installed = false;
  const office = { id: "cs-office@cs-curated", name: "cs-office", installed: false } as PluginSummary;
  const other = { id: "other", name: "个人插件", installed: true } as PluginSummary;
  const extensions = {
    listPlugins: async () => ({ marketplaces: [{ name: "cs-curated", path: "C:/cs/market.json", plugins: [{ ...office, installed }, other] }], marketplaceLoadErrors: [] }),
    installPlugin: async () => { installed = true; }, uninstallPlugin: async () => { installed = false; },
  } as unknown as ReturnType<typeof useExtensions>;
  render(<PluginManagementPage extensions={extensions} revision={0} onClose={vi.fn()} onChanged={vi.fn()} />);
  await screen.findByText("个人插件");
  const row = screen.getByText("CS Office").closest("article")!;
  fireEvent.click(within(row).getByText("安装"));
  await within(row).findByText("卸载");
  expect(screen.getAllByRole("article")[0]).toBe(row);
  expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  expect(screen.queryByRole("status")).toBeNull();
  fireEvent.click(within(row).getByText("卸载"));
  await within(row).findByText("安装");
  expect(screen.getAllByRole("article")[0]).toBe(row);
});
