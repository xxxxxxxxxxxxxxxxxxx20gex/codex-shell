import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { Turn } from "../../generated/app-server/v2/Turn";
import { ConversationTimeline } from "./ConversationTimeline";
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
    const markup = renderToStaticMarkup(
      <ConversationTimeline turns={[completedTurn()]} running={false} modelId="gpt-test" />,
    );

    expect(markup).toContain("2026/08/07 10:20:30");
    expect(markup).toContain("2026/08/07 10:20:38 · 8.4 秒");
    expect(markup).not.toContain("发送于");
    expect(markup).not.toContain("回答于");
    expect(markup).not.toContain("耗时");
  });

  it("shows an in-progress answer label", () => {
    const turn = { ...completedTurn(), status: "inProgress", completedAt: null, durationMs: null } as Turn;
    const markup = renderToStaticMarkup(
      <ConversationTimeline turns={[turn]} running modelId="gpt-test" />,
    );

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
    const markup = renderToStaticMarkup(
      <ConversationTimeline turns={[turn]} running={false} modelId="gpt-test" />,
    );

    expect(markup).toContain("运行命令");
    expect(markup).toContain("pnpm test");
    expect(markup).toContain("16 tests passed");
  });
});
