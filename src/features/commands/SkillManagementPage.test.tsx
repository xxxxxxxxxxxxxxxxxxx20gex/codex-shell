// @vitest-environment happy-dom
import { invoke } from "@tauri-apps/api/core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import { SkillManagementPage } from "./SkillManagementPage";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const path = "C:/cs-home/skills/project-management-docs/SKILL.md";
const skill = (overrides: Partial<SkillMetadata> = {}): SkillMetadata => ({
  name: "project-management-docs", path, description: "项目文档管理", enabled: false,
  scope: "user", pluginId: null,
  ...overrides,
});
const defaults = () => ({
  codexHome: "C:/cs-home", revision: 0, onClose: vi.fn(),
  loadSkills: vi.fn(async (): Promise<SkillMetadata[]> => []),
  setEnabled: vi.fn(async (_path: string, enabled: boolean) => enabled),
});
const titles = () => Array.from(screen.getByRole("region", { name: "CS 内置" }).querySelectorAll("strong"), (node) => node.textContent);
const installButton = () => within(screen.getByText("项目文档管理").closest("article")!).getByRole("button", { name: "安装" });

it("keeps the builtin slot stable across installation, toggling and uninstall", async () => {
  const props = defaults();
  let installed = false;
  let enabled = false;
  props.loadSkills.mockImplementation(async () => installed ? [skill({ enabled })] : []);
  props.setEnabled.mockImplementation(async (_path, next) => { enabled = next; return next; });
  vi.mocked(invoke).mockImplementation(async (command) => {
    installed = command === "install_builtin_project_docs";
    return path;
  });
  render(<SkillManagementPage {...props} />);
  await waitFor(() => expect(props.loadSkills).toHaveBeenCalled());
  const initial = titles();
  expect(initial).toEqual(["兔子生图", "高德地图", "项目文档管理"]);
  fireEvent.click(installButton());
  const toggle = await screen.findByRole("switch", { name: "project-management-docs 启用状态" });
  expect(invoke).toHaveBeenCalledWith("install_builtin_project_docs");
  expect(props.setEnabled).toHaveBeenCalledWith(path, false);
  expect(toggle.getAttribute("aria-checked")).toBe("false");
  expect(titles()).toEqual(initial);
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle.getAttribute("aria-checked")).toBe("true"));
  expect(titles()).toEqual(initial);
  fireEvent.click(screen.getByRole("button", { name: "卸载" }));
  await waitFor(() => expect(installButton()).toBeTruthy());
  expect(invoke).toHaveBeenCalledWith("uninstall_local_skill", { path });
  expect(titles()).toEqual(initial);
});

it.each(["reject", "policy"])("reports an unsuccessful default disable: %s", async (failure) => {
  const props = defaults();
  vi.mocked(invoke).mockResolvedValue(path);
  if (failure === "reject") props.setEnabled.mockRejectedValue(new Error("write failed"));
  else props.setEnabled.mockResolvedValue(true);
  render(<SkillManagementPage {...props} />);
  fireEvent.click(installButton());
  expect((await screen.findByRole("alert")).textContent).toContain(failure === "reject" ? "默认关闭失败" : "有效状态仍为启用");
  await waitFor(() => expect(props.loadSkills).toHaveBeenCalledTimes(2));
});

it("does not treat a same-name skill outside the CS user directory as bundled", async () => {
  const props = defaults();
  props.loadSkills.mockResolvedValue([skill({ path: "C:/official/skills/project-management-docs/SKILL.md" })]);
  render(<SkillManagementPage {...props} />);
  const personal = await screen.findByRole("region", { name: "个人" });
  expect(within(personal).queryByRole("button", { name: "卸载" })).toBeNull();
  expect(titles()).toEqual(["兔子生图", "高德地图", "项目文档管理"]);
  fireEvent.change(screen.getByPlaceholderText("搜索技能"), { target: { value: "project-management-docs" } });
  expect(titles()).toEqual(["项目文档管理"]);
});
