// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { McpStatusPanel } from "./McpStatusPanel";

afterEach(cleanup);

describe("McpStatusPanel", () => {
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
          serverInfo: null,
          tools: {},
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
          serverInfo: null,
          tools: {},
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
});
