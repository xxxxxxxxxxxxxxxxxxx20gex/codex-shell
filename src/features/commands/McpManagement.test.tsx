// @vitest-environment happy-dom
import { invoke } from "@tauri-apps/api/core";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { McpStatusPanel } from "./McpStatusPanel";
import { useExtensions } from "../extensions/useExtensions";
import type { AppServerClient } from "../runtime/appServerClient";
import type { McpServerStatus } from "../../generated/app-server/v2/McpServerStatus";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => undefined) }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const defaults = () => ({
  loadServers: vi.fn(async (): Promise<McpServerStatus[]> => []),
  reloadServers: vi.fn(async () => {}), loginServer: vi.fn(), readResource: vi.fn(), onClose: vi.fn(),
  readConfig: vi.fn(async () => ({ version: "v1", servers: {} })),
  writeConfig: vi.fn(async () => {}),
});

async function addHttp(url: string) {
  await waitFor(() => expect(screen.getByRole("button", { name: "添加服务器" }).hasAttribute("disabled")).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
  fireEvent.change(screen.getByLabelText("服务器名称"), { target: { value: "test" } });
  fireEvent.change(screen.getByLabelText("连接方式"), { target: { value: "http" } });
  fireEvent.change(screen.getByLabelText("HTTP 地址"), { target: { value: url } });
  fireEvent.change(screen.getByLabelText(/Bearer Token/), { target: { value: "dummy-token" } });
}

describe("MCP mutation boundaries", () => {
  it.each(["http://example.com/mcp", "http://192.168.1.8/mcp", "http://localhost.evil.test/mcp"])("rejects remote plaintext endpoint %s before persistence", async (url) => {
    const props = defaults(); render(<McpStatusPanel {...props} />);
    await addHttp(url); fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "远程 MCP 服务必须使用 HTTPS；HTTP 仅允许本机回环地址。");
    expect(props.writeConfig).not.toHaveBeenCalled(); expect(invoke).not.toHaveBeenCalled();
  });

  it.each(["http://127.0.0.1/mcp", "http://[::1]/mcp", "https://example.com/mcp"])("persists token before reloading %s", async (url) => {
    const props = defaults();
    props.reloadServers.mockImplementation(async () => { expect(invoke).toHaveBeenCalledWith("save_mcp_secret", { name: "test", secret: "dummy-token" }); });
    render(<McpStatusPanel {...props} />);
    await addHttp(url); fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    await waitFor(() => expect(props.reloadServers).toHaveBeenCalledTimes(1));
  });

  it("captures the secret before awaiting persistence and blocks ordinary dismissal", async () => {
    const props = defaults(); const pending = deferred<void>();
    props.writeConfig.mockImplementation(() => pending.promise);
    const view = render(<McpStatusPanel {...props} />);
    await addHttp("https://example.com/mcp"); fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "关闭 MCP" }).hasAttribute("disabled")).toBe(true));
    fireEvent.keyDown(document, { key: "Escape" }); fireEvent.pointerDown(document.body);
    expect(props.onClose).not.toHaveBeenCalled();
    view.unmount();
    await act(async () => { pending.resolve(); await pending.promise; });
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("save_mcp_secret", { name: "test", secret: "dummy-token" }));
  });

  it("keeps the original edit version after a refresh and preserves the conflicting draft", async () => {
    const props = defaults();
    const read = vi.fn().mockResolvedValueOnce({ version: "v1", servers: { test: { command: "old" } } }).mockResolvedValue({ version: "v2", servers: { test: { command: "external" } } });
    props.writeConfig.mockRejectedValue(new Error("配置版本冲突"));
    render(<McpStatusPanel {...props} readConfig={read} />);
    fireEvent.click(await screen.findByRole("button", { name: "编辑 test" }));
    fireEvent.change(screen.getByLabelText("可执行命令"), { target: { value: "draft" } });
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => expect(props.writeConfig).toHaveBeenCalledWith("test", expect.objectContaining({ command: "draft" }), "v1"));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "配置版本冲突");
    expect(screen.getByLabelText("可执行命令")).toHaveProperty("value", "draft");
  });

  it("reports reload failure after credentials are saved", async () => {
    const props = defaults(); props.reloadServers.mockRejectedValue(new Error("offline"));
    render(<McpStatusPanel {...props} />);
    await addHttp("https://example.com/mcp"); fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "配置与凭据处理已完成，但 MCP 重新加载失败。请点击刷新重试，或重启运行环境。");
    expect(invoke).toHaveBeenCalledWith("save_mcp_secret", { name: "test", secret: "dummy-token" });
    expect(props.writeConfig).toHaveBeenCalledTimes(1);
  });

  it("clears credentials even if the subsequent reload fails", async () => {
    const props = defaults(); props.reloadServers.mockRejectedValue(new Error("offline"));
    render(<McpStatusPanel {...props} readConfig={async () => ({ version: "v1", servers: { test: { url: "https://example.com/mcp" } } })} />);
    fireEvent.click(await screen.findByRole("button", { name: "删除 test" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "配置与凭据处理已完成，但 MCP 重新加载失败。请点击刷新重试，或重启运行环境。");
    expect(invoke).toHaveBeenCalledWith("save_mcp_secret", { name: "test", secret: null });
  });

  it("reports credential failure without claiming rollback or reloading", async () => {
    const props = defaults();
    vi.mocked(invoke).mockRejectedValueOnce(new Error("credential store unavailable"));
    render(<McpStatusPanel {...props} />);
    await addHttp("https://example.com/mcp"); fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "配置已保存，但凭据保存失败。请重新编辑并输入 Token。");
    expect(props.writeConfig).toHaveBeenCalledTimes(1);
    expect(props.reloadServers).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/Bearer Token/)).toBeNull();
  });

  it("does not change credentials if configuration persistence fails", async () => {
    const props = defaults(); props.writeConfig.mockRejectedValue(new Error("配置写入失败"));
    render(<McpStatusPanel {...props} />);
    await addHttp("https://example.com/mcp"); fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "配置写入失败");
    expect(invoke).not.toHaveBeenCalled(); expect(props.reloadServers).not.toHaveBeenCalled();
  });

  it("returns overridden persistence as a warning rather than skipping credential work", async () => {
    const writeConfig = vi.fn(async () => ({ status: "okOverridden" }));
    const reloadMcpServers = vi.fn();
    const client = { extensions: { writeConfig }, reloadMcpServers } as unknown as AppServerClient;
    const { result } = renderHook(() => useExtensions(async () => client));
    expect(await result.current.writeMcpConfig("test", { command: "npx" }, "v1")).toEqual({ warning: expect.stringContaining("覆盖") });
    expect(writeConfig).toHaveBeenCalledWith({ expectedVersion: "v1", edits: [{ keyPath: "mcp_servers.test", value: { command: "npx" }, mergeStrategy: "replace" }] });
    expect(reloadMcpServers).not.toHaveBeenCalled();
  });

  it("blocks enabling a legacy plaintext server but still allows disabling and deleting it", async () => {
    const writeConfig = vi.fn(async () => ({ status: "ok" }));
    const client = { extensions: { writeConfig } } as unknown as AppServerClient;
    const { result } = renderHook(() => useExtensions(async () => client));
    await expect(result.current.writeMcpConfig("test", { url: "http://example.com", enabled: true }, "v1")).rejects.toThrow("HTTPS");
    expect(writeConfig).not.toHaveBeenCalled();
    await result.current.writeMcpConfig("test", { url: "http://example.com", enabled: false }, "v1");
    await result.current.writeMcpConfig("test", null, "v2");
    expect(writeConfig).toHaveBeenCalledTimes(2);
  });
});

describe("MCP refresh lifecycle", () => {
  it("refreshes only once after a mutation when the parent supplies revisions", async () => {
    const props = defaults();
    function Fixture() {
      const [revision, setRevision] = useState(0);
      return <McpStatusPanel {...props} revision={revision} onChanged={() => setRevision(value => value + 1)} />;
    }
    render(<Fixture />); await addHttp("https://example.com/mcp");
    fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    await waitFor(() => expect(props.loadServers).toHaveBeenCalledTimes(2));
  });

  it("ignores an older response that finishes after the latest refresh", async () => {
    const props = defaults(); const old = deferred<McpServerStatus[]>();
    props.loadServers.mockImplementationOnce(() => old.promise);
    const view = render(<McpStatusPanel {...props} revision={0} />);
    view.rerender(<McpStatusPanel {...props} revision={1} />);
    await waitFor(() => expect(props.loadServers).toHaveBeenCalledTimes(2));
    await act(async () => { old.resolve([{ name: "stale", tools: {}, resources: [], authStatus: "unsupported" } as unknown as McpServerStatus]); });
    expect(screen.queryByText("stale")).toBeNull();
  });
});
