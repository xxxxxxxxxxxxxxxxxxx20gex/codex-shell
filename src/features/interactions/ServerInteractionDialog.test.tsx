// @vitest-environment happy-dom

import { openUrl } from "@tauri-apps/plugin-opener";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerInteractionDialog } from "./ServerInteractionDialog";
import { ServerInteractionStore } from "./serverInteractionStore";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

afterEach(cleanup);

describe("ServerInteractionDialog", () => {
  it("returns structured answers for options and secret text", async () => {
    const store = new ServerInteractionStore();
    const result = store.request("input-1", {
      kind: "userInput",
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "item-1",
        autoResolutionMs: null,
        questions: [
          {
            id: "scope",
            header: "范围",
            question: "选择执行范围",
            isOther: false,
            isSecret: false,
            options: [{ label: "当前项目", description: "只处理工作区" }],
          },
          {
            id: "token",
            header: "令牌",
            question: "输入临时令牌",
            isOther: true,
            isSecret: true,
            options: null,
          },
        ],
      },
    });
    render(<ServerInteractionDialog store={store} />);

    fireEvent.click(screen.getByRole("button", { name: /当前项目/ }));
    fireEvent.change(screen.getByPlaceholderText("输入内容（界面将隐藏）"), {
      target: { value: "secret-value" },
    });
    fireEvent.click(screen.getByRole("button", { name: "提交回答" }));

    await expect(result).resolves.toEqual({
      answers: {
        scope: { answers: ["当前项目"] },
        token: { answers: ["secret-value"] },
      },
    });
  });

  it("returns arrays for typed MCP multi-select fields", async () => {
    const store = new ServerInteractionStore();
    const result = store.request("mcp-1", {
      kind: "mcpElicitation",
      params: {
        mode: "form",
        threadId: "thread-1",
        turnId: "turn-1",
        serverName: "docs",
        message: "选择数据源",
        _meta: null,
        requestedSchema: {
          type: "object",
          required: ["sources", "label"],
          properties: {
            sources: {
              type: "array",
              title: "数据源",
              items: { type: "string", enum: ["docs", "issues"] },
            },
            label: { type: "string", title: "标签", minLength: 3 },
            optionalCount: { type: "integer", title: "可选数量", minimum: 1 },
            includeDrafts: { type: "boolean", title: "包含草稿" },
          },
        },
      },
    });
    render(<ServerInteractionDialog store={store} />);

    const submit = screen.getByRole("button", { name: "提交" });
    expect(submit.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /docs/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "标签" }), { target: { value: "ab" } });
    expect(submit.hasAttribute("disabled")).toBe(false);
    fireEvent.click(submit);
    expect(screen.getByText("标签至少需要 3 个字符")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "标签" }), { target: { value: "docs" } });
    fireEvent.click(submit);

    await expect(result).resolves.toEqual({
      action: "accept",
      content: { sources: ["docs"], label: "docs" },
      _meta: null,
    });
  });

  it("blocks non-HTTP MCP elicitation URLs", () => {
    const store = new ServerInteractionStore();
    void store.request("mcp-url", {
      kind: "mcpElicitation",
      params: {
        mode: "url",
        threadId: "thread-1",
        turnId: null,
        serverName: "unsafe",
        message: "open",
        url: "javascript:alert(1)",
        elicitationId: "request-1",
        _meta: null,
      },
    });
    render(<ServerInteractionDialog store={store} />);

    expect(screen.getByText("服务器返回了不安全的链接，已阻止打开。")).toBeTruthy();
    expect(screen.getByRole("button", { name: "已打开，继续" }).hasAttribute("disabled")).toBe(true);
  });

  it("opens safe MCP elicitation URLs with the system opener", () => {
    const store = new ServerInteractionStore();
    void store.request("mcp-url-safe", {
      kind: "mcpElicitation",
      params: {
        mode: "url",
        threadId: "thread-1",
        turnId: null,
        serverName: "safe",
        message: "open",
        url: "https://example.com/authorize",
        elicitationId: "request-2",
        _meta: null,
      },
    });
    render(<ServerInteractionDialog store={store} />);

    fireEvent.click(screen.getByRole("link", { name: "https://example.com/authorize" }));

    expect(openUrl).toHaveBeenCalledWith("https://example.com/authorize");
  });
});
