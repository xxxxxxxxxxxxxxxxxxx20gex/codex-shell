import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";
import { ConversationTurn } from "./ConversationTurn";
import { formatMessageTimestamp, formatTurnDuration } from "./conversationTiming";

function completedTurn(): Turn {
  const user: ThreadItem = {
    type: "userMessage",
    id: "user-1",
    clientId: null,
    content: [{ type: "text", text: "测试", text_elements: [] }],
  };
  const agent: ThreadItem = {
    type: "agentMessage",
    id: "agent-1",
    text: "回答",
    phase: null,
    memoryCitation: null,
  };
  return {
    id: "turn-1",
    items: [user, agent],
    itemsView: "full",
    status: "completed",
    error: null,
    startedAt: new Date(2026, 7, 7, 10, 20, 30).getTime() / 1000,
    completedAt: new Date(2026, 7, 7, 10, 20, 38).getTime() / 1000,
    durationMs: 8421,
  };
}

function renderTurn(turn: Turn, active = false) {
  return renderToStaticMarkup(
    <ConversationTurn
      turn={turn}
      active={active}
      canFork={!active}
      onFork={vi.fn()}
      activeItemTurnIds={{}}
      mcpProgressByItemId={{}}
    />,
  );
}

describe("conversation timing", () => {
  it("formats timestamps in local time", () => {
    const timestamp = new Date(2026, 7, 7, 10, 20, 30).getTime() / 1000;

    expect(formatMessageTimestamp(timestamp)).toBe("2026/08/07 10:20:30");
  });

  it("formats short and long durations", () => {
    expect(formatTurnDuration(8421)).toBe("8.4 秒");
    expect(formatTurnDuration(65_234)).toBe("1 分 05 秒");
  });

  it("renders send time, answer time, and duration", () => {
    const markup = renderTurn(completedTurn());

    expect(markup).toContain("2026/08/07 10:20:30");
    expect(markup).toContain("2026/08/07 10:20:38 · 8.4 秒");
    expect(markup).not.toContain("发送于");
    expect(markup).not.toContain("回答于");
    expect(markup).not.toContain("耗时");
  });

  it("renders copy and fork actions below a completed answer", () => {
    const markup = renderToStaticMarkup(
      <ConversationTurn
        turn={completedTurn()}
        active={false}
        canFork
        onFork={vi.fn()}
        activeItemTurnIds={{}}
        mcpProgressByItemId={{}}
      />,
    );

    expect(markup).toContain('aria-label="复制回答"');
    expect(markup).toContain('aria-label="分叉 Session"');
  });

  it("shows an in-progress answer label", () => {
    const turn = { ...completedTurn(), status: "inProgress", completedAt: null, durationMs: null } as Turn;
    const markup = renderTurn(turn, true);

    expect(markup).toContain("生成中");
  });

  it("renders app-server command activity instead of hiding it", () => {
    const command: ThreadItem = {
      type: "commandExecution",
      id: "command-1",
      pluginId: null,
      scriptPath: null,
      command: "pnpm test",
      cwd: "C:\\work",
      processId: null,
      source: "agent",
      status: "completed",
      commandActions: [],
      aggregatedOutput: "16 tests passed",
      exitCode: 0,
      durationMs: 8400,
    };
    const turn = { ...completedTurn(), items: [command] };
    const markup = renderTurn(turn);

    expect(markup).toContain("运行命令");
    expect(markup).toContain("pnpm test");
    expect(markup).toContain("16 tests passed");
    expect(markup).toContain("执行过程");
    expect(markup).toContain("已完成 1 项活动");
    expect(markup).toContain('class="activity-card activity-command-card"');
    expect(markup).not.toContain('class="activity-card activity-command-card" open=""');
  });

  it("expands an active command while it is running", () => {
    const command: ThreadItem = {
      type: "commandExecution",
      id: "command-active",
      pluginId: null,
      scriptPath: null,
      command: "pnpm build",
      cwd: "C:\\work",
      processId: "123",
      source: "agent",
      status: "inProgress",
      commandActions: [],
      aggregatedOutput: null,
      exitCode: null,
      durationMs: null,
    };
    const turn = { ...completedTurn(), items: [command], status: "inProgress" } as Turn;
    const markup = renderToStaticMarkup(
      <ConversationTurn
        turn={turn}
        active
        canFork={false}
        activeItemTurnIds={{ "command-active": turn.id }}
        mcpProgressByItemId={{}}
      />,
    );

    expect(markup).toContain('class="activity-card activity-command-card" open=""');
    expect(markup).toContain('class="turn-activity-group" open=""');
    expect(markup).toContain("运行中");
    expect(markup).not.toContain("<small>inProgress</small>");
  });

  it("keeps two or more active process items collapsed behind one summary", () => {
    const reasoning: ThreadItem = {
      type: "reasoning",
      id: "reasoning-active",
      summary: ["正在确定修改范围"],
      content: [],
    };
    const command: ThreadItem = {
      type: "commandExecution",
      id: "command-active-grouped",
      pluginId: null,
      scriptPath: null,
      command: "pnpm test",
      cwd: "C:\\work",
      processId: "123",
      source: "agent",
      status: "inProgress",
      commandActions: [],
      aggregatedOutput: null,
      exitCode: null,
      durationMs: null,
    };
    const turn = {
      ...completedTurn(),
      items: [reasoning, command],
      status: "inProgress",
    } as Turn;
    const markup = renderToStaticMarkup(
      <ConversationTurn
        turn={turn}
        active
        canFork={false}
        activeItemTurnIds={{ "command-active-grouped": turn.id }}
        mcpProgressByItemId={{}}
      />,
    );

    expect(markup).toContain("正在处理");
    expect(markup).toContain("运行命令");
    expect(markup).not.toContain('class="turn-activity-group" open=""');
  });

  it("groups commentary and reasoning outside the final answer", () => {
    const commentary: ThreadItem = { type: "agentMessage", id: "commentary-1", text: "我先检查项目结构。", phase: "commentary", memoryCitation: null };
    const reasoning: ThreadItem = { type: "reasoning", id: "reasoning-1", summary: ["定位核心模块"], content: [] };
    const answer: ThreadItem = { type: "agentMessage", id: "answer-1", text: "检查完成。", phase: "final_answer", memoryCitation: null };
    const markup = renderTurn({ ...completedTurn(), items: [commentary, reasoning, answer] });

    expect(markup).toContain("执行过程");
    expect(markup).toContain('class="turn-commentary"');
    expect(markup).toContain("我先检查项目结构。");
    expect(markup).toContain("分析过程");
    expect(markup.indexOf("我先检查项目结构。")).toBeLessThan(markup.indexOf("分析过程"));
    expect(markup).toContain('class="agent-response"');
    expect(markup).toContain("检查完成。");
    expect((markup.match(/class="agent-accent"/g) ?? []).length).toBe(1);
  });

  it("omits completed reasoning entries that contain no visible content", () => {
    const emptyReasoning: ThreadItem = {
      type: "reasoning",
      id: "reasoning-empty",
      summary: ["", "   "],
      content: [],
    };
    const commentary: ThreadItem = {
      type: "agentMessage",
      id: "commentary-visible",
      text: "正在核对实现。",
      phase: "commentary",
      memoryCitation: null,
    };
    const markup = renderTurn({ ...completedTurn(), items: [emptyReasoning, commentary] });

    expect(markup).not.toContain("分析过程");
    expect(markup).toContain("正在核对实现。");
    expect(markup).toContain("已完成 1 项活动");
  });

  it("keeps live progress for active reasoning even before it has content", () => {
    const emptyReasoning: ThreadItem = {
      type: "reasoning",
      id: "reasoning-active-empty",
      summary: [],
      content: [],
    };
    const turn = {
      ...completedTurn(),
      items: [emptyReasoning],
      status: "inProgress",
      completedAt: null,
      durationMs: null,
    } as Turn;
    const markup = renderToStaticMarkup(
      <ConversationTurn
        turn={turn}
        active
        canFork={false}
        activeItemTurnIds={{ "reasoning-active-empty": turn.id }}
        mcpProgressByItemId={{}}
      />,
    );

    expect(markup).toContain("正在分析问题");
    expect(markup).not.toContain("分析过程");
    expect(markup).not.toContain("turn-activity-group");
  });

  it("keeps steered user messages in their native item order", () => {
    const firstUser: ThreadItem = {
      type: "userMessage",
      id: "user-first",
      clientId: null,
      content: [{ type: "text", text: "先检查项目", text_elements: [] }],
    };
    const firstReasoning: ThreadItem = { type: "reasoning", id: "reasoning-before", summary: ["正在检查"], content: [] };
    const steeredUser: ThreadItem = {
      type: "userMessage",
      id: "user-steered",
      clientId: "client-steer-1",
      content: [{ type: "text", text: "优先检查测试", text_elements: [] }],
    };
    const secondReasoning: ThreadItem = { type: "reasoning", id: "reasoning-after", summary: ["调整检查顺序"], content: [] };
    const answer: ThreadItem = { type: "agentMessage", id: "answer-steered", text: "检查完成", phase: "final_answer", memoryCitation: null };
    const markup = renderTurn({ ...completedTurn(), items: [firstUser, firstReasoning, steeredUser, secondReasoning, answer] });

    expect(markup.indexOf("先检查项目")).toBeLessThan(markup.indexOf("正在检查"));
    expect(markup.indexOf("正在检查")).toBeLessThan(markup.indexOf("优先检查测试"));
    expect(markup.indexOf("优先检查测试")).toBeLessThan(markup.indexOf("调整检查顺序"));
    expect(markup.indexOf("调整检查顺序")).toBeLessThan(markup.indexOf("检查完成"));
    expect((markup.match(/2026\/08\/07 10:20:30/g) ?? []).length).toBe(1);
    expect((markup.match(/class="turn-activity-group"/g) ?? []).length).toBe(2);
  });

  it("renders final answers as safe Markdown", () => {
    const answer: ThreadItem = {
      type: "agentMessage",
      id: "answer-markdown",
      text: "## 结果\n\n```powershell\ncodex --version\n```\n\n<script>alert(1)</script>",
      phase: "final_answer",
      memoryCitation: null,
    };
    const markup = renderTurn({ ...completedTurn(), items: [answer] });

    expect(markup).toContain("<h2>结果</h2>");
    expect(markup).toContain("<pre><code class=\"language-powershell\">codex --version");
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("```powershell");
  });

  it("uses a minimal assistant accent and summarizes file changes at the end", () => {
    const firstAgent: ThreadItem = { type: "agentMessage", id: "agent-1", text: "第一段", phase: null, memoryCitation: null };
    const secondAgent: ThreadItem = { type: "agentMessage", id: "agent-2", text: "第二段", phase: null, memoryCitation: null };
    const fileChange: ThreadItem = {
      type: "fileChange",
      id: "file-1",
      status: "completed",
      changes: [{
        path: "src/App.tsx",
        kind: { type: "update", move_path: null },
        diff: "@@ -1 +1 @@\n-old\n+new",
      }],
    };
    const markup = renderTurn({ ...completedTurn(), items: [firstAgent, fileChange, secondAgent] });

    expect((markup.match(/class="agent-accent"/g) ?? []).length).toBe(1);
    expect(markup).not.toContain('class="agent-avatar"');
    expect(markup).not.toContain('class="agent-meta"');
    expect(markup).not.toContain("<strong>Codex</strong>");
    expect(markup).toContain("已编辑 1 个文件");
    expect(markup).toContain("修改");
    expect(markup.indexOf("已编辑 1 个文件")).toBeGreaterThan(markup.indexOf("第二段"));
    expect(markup).not.toContain("修改文件 · 1");
  });

  it("surfaces the native active item and MCP progress in the conversation", () => {
    const mcp: ThreadItem = {
      type: "mcpToolCall",
      id: "mcp-1",
      server: "docs",
      tool: "search",
      status: "inProgress",
      arguments: { query: "app-server" },
      appContext: null,
      pluginId: null,
      result: null,
      error: null,
      durationMs: null,
    };
    const turn = {
      ...completedTurn(),
      items: [mcp],
      status: "inProgress",
      completedAt: null,
      durationMs: null,
    } as Turn;
    const progress = {
      threadId: "thread-1",
      turnId: "turn-1",
      itemId: "mcp-1",
      message: "正在读取接口文档",
    };
    const markup = renderToStaticMarkup(
      <ConversationTurn
        turn={turn}
        active
        activeItemTurnIds={{ "mcp-1": "turn-1" }}
        mcpProgressByItemId={{ "mcp-1": progress }}
        canFork={false}
      />,
    );

    expect(markup).toContain("正在读取接口文档");
    expect(markup).toContain("正在处理");
    expect(markup).not.toContain("正在处理任务…");
    expect(markup).not.toContain("Codex 正在处理任务…");
    expect(markup).toContain("role=\"status\"");
  });
});
