// @vitest-environment happy-dom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { TurnActivityGroup } from "./TurnActivityGroup";

const activity: ThreadItem = {
  type: "reasoning",
  id: "reasoning-1",
  summary: ["正在检查"],
  content: [],
};

function renderActivity(turnActive: boolean, startedAt: number | null, durationMs: number | null) {
  return render(
    <TurnActivityGroup
      items={[activity]}
      active={turnActive}
      turnActive={turnActive}
      startedAt={startedAt}
      durationMs={durationMs}
      showHeader
      turnId="turn-1"
      activeItemTurnIds={{}}
      mcpProgressByItemId={{}}
    />,
  );
}

describe("TurnActivityGroup timing", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("updates elapsed time while a turn is running", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T10:00:05Z"));
    const startedAt = Date.now() / 1_000 - 5;

    renderActivity(true, startedAt, null);
    expect(screen.getByText("正在处理 5 秒")).toBeTruthy();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("正在处理 6 秒")).toBeTruthy();
  });

  it("freezes the final duration after completion", () => {
    renderActivity(false, 100, 8_421);

    expect(screen.getByText("已处理 8.4 秒")).toBeTruthy();
  });

  it("clears its timer when removed", () => {
    vi.useFakeTimers();
    const view = renderActivity(true, Date.now() / 1_000, null);
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
