// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  render(<SkillManagementPage codexHome="C:/cs" revision={0} loadSkills={async () => skills} setEnabled={vi.fn()} onClose={vi.fn()} onAddSkill={vi.fn()} />);
  expect(await screen.findAllByText("卸载")).toHaveLength(1);
  vi.mocked(open).mockRejectedValueOnce(new Error("目录选择失败"));
  fireEvent.click(screen.getByText("从目录安装"));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "目录选择失败");
});

it("shows pending Connector authentication rather than treating plugin installation as ready", async () => {
  const plugin = { id: "demo@local", name: "demo", installed: false, enabled: true, availability: "AVAILABLE", installPolicy: "AVAILABLE", authPolicy: "ON_INSTALL", interface: null } as PluginSummary;
  const installPlugin = vi.fn(async () => ({ authPolicy: "ON_INSTALL" as const, appsNeedingAuth: [{ id: "connector", name: "Example Connector", description: null, category: null, installUrl: null }] }));
  const extensions = { listPlugins: async () => ({ marketplaces: [{ name: "local", path: "C:/market/marketplace.json", interface: null, plugins: [plugin] }], marketplaceLoadErrors: [], featuredPluginIds: [] }), installPlugin } as unknown as ReturnType<typeof useExtensions>;
  const changed = vi.fn();
  render(<PluginManagementPage extensions={extensions} revision={0} onChanged={changed} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByText("安装"));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Example Connector"));
  expect(screen.getByRole("status").textContent).toContain("仍待认证");
  expect(changed).toHaveBeenCalledOnce();
});
