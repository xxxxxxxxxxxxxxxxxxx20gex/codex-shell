// @vitest-environment happy-dom

import { openUrl } from "@tauri-apps/plugin-opener";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpStatusPanel } from "./McpStatusPanel";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => undefined) }));

afterEach(cleanup);

describe("McpStatusPanel", () => {
  it("starts with one server row, edits on demand, and preserves config on toggle", async () => {
    const write = vi.fn(async () => undefined);
    const read = vi.fn(async () => ({ version: "v1", servers: { browser: { command: "npx", args: ["browser"], enabled: false } } }));
    render(<McpStatusPanel loadServers={vi.fn(async () => [])} loginServer={vi.fn()} reloadServers={vi.fn()} readResource={vi.fn()} onClose={vi.fn()} readConfig={read} writeConfig={write} />);
    expect(await screen.findByText("browser")).toBeTruthy();
    expect(screen.queryByLabelText("服务器名称")).toBeNull();
    fireEvent.click(screen.getByRole("switch", { name: "启用 browser" }));
    await waitFor(() => expect(write).toHaveBeenCalledWith("browser", { command: "npx", args: ["browser"], enabled: true }, "v1"));
    await waitFor(() => expect(screen.getByRole("button", { name: "编辑 browser" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "编辑 browser" }));
    expect(screen.getByLabelText("服务器名称")).toHaveProperty("value", "browser");
    expect(screen.queryByRole("switch")).toBeNull();
    fireEvent.change(screen.getByLabelText("可执行命令"), { target: { value: "uvx" } });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));
    await waitFor(() => expect(write).toHaveBeenLastCalledWith("browser", expect.objectContaining({ command: "uvx", args: ["browser"] }), "v1"));
    await waitFor(() => expect(screen.queryByLabelText("服务器名称")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "删除 browser" }));
    expect(write).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));
    await waitFor(() => expect(write).toHaveBeenLastCalledWith("browser", null, "v1"));
  });

  it("keeps failed edits visible and lets users return to the list", async () => {
    render(<McpStatusPanel loadServers={vi.fn(async () => [])} loginServer={vi.fn()} reloadServers={vi.fn()} readResource={vi.fn()} onClose={vi.fn()} readConfig={vi.fn(async () => ({ version: "v1", servers: {} }))} writeConfig={vi.fn(async () => { throw new Error("保存失败"); })} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "添加服务器" }).hasAttribute("disabled")).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    fireEvent.change(screen.getByLabelText("服务器名称"), { target: { value: "new-server" } });
    fireEvent.change(screen.getByLabelText("可执行命令"), { target: { value: "npx" } });
    fireEvent.click(screen.getByRole("button", { name: "添加服务器" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "保存失败");
    expect(screen.getByLabelText("可执行命令")).toHaveProperty("value", "npx");
    fireEvent.click(screen.getByRole("button", { name: "返回列表" }));
    expect(screen.queryByLabelText("服务器名称")).toBeNull();
  });
  it("reads resources through app-server and bounds the preview", async () => {
    const readResource = vi.fn(async () => [{
      uri: "docs://large",
      mimeType: "text/plain",
      text: "x".repeat(120_000),
    }]);
    render(
        <McpStatusPanel
        loadServers={vi.fn(async () => [{
          name: "docs",
          runtimeStatus: null,
          pluginId: null,
          serverInfo: null,
          httpOrigin: null,
          serverCapabilities: null,
          tools: {},
          toolsError: null,
          resources: [{ name: "large", title: "Large docs", uri: "docs://large" }],
          resourceTemplates: [],
          authStatus: "unsupported" as const,
        }])}
        loginServer={vi.fn()}
        reloadServers={vi.fn()}
        readResource={readResource}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByText("Large docs"));
    await waitFor(() => expect(readResource).toHaveBeenCalledWith("docs", "docs://large"));
    const preview = screen.getByText((_, element) => (
      element?.tagName === "PRE" && Boolean(element.textContent?.includes("[预览已截断]"))
    ));
    expect(preview.textContent?.length).toBeLessThan(101_000);
  });

  it("rejects an unsafe OAuth URL returned by an MCP server", async () => {
    render(
      <McpStatusPanel
        loadServers={vi.fn(async () => [{
          name: "unsafe",
          runtimeStatus: null,
          pluginId: null,
          serverInfo: null,
          httpOrigin: null,
          serverCapabilities: null,
          tools: {},
          toolsError: null,
          resources: [],
          resourceTemplates: [],
          authStatus: "notLoggedIn" as const,
        }])}
        loginServer={vi.fn(async () => "javascript:alert(1)")}
        reloadServers={vi.fn()}
        readResource={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "OAuth 登录" }));
    expect(await screen.findByText("MCP 服务器返回了不安全的 OAuth 地址")).toBeTruthy();
  });

  it("opens a safe OAuth URL with the system opener", async () => {
    render(
      <McpStatusPanel
        loadServers={vi.fn(async () => [{
          name: "safe",
          runtimeStatus: null,
          pluginId: null,
          serverInfo: null,
          httpOrigin: null,
          serverCapabilities: null,
          tools: {},
          toolsError: null,
          resources: [],
          resourceTemplates: [],
          authStatus: "notLoggedIn" as const,
        }])}
        loginServer={vi.fn(async () => "https://example.com/oauth")}
        reloadServers={vi.fn()}
        readResource={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "OAuth 登录" }));
    await waitFor(() => expect(openUrl).toHaveBeenCalledWith("https://example.com/oauth"));
  });
});
