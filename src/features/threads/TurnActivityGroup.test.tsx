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

function renderActivity(turnActive: boolean, startedAt: number | null, durationMs: number | null, retryingMessage: string | null = null) {
  return render(
    <TurnActivityGroup
      items={[activity]}
      active={turnActive}
      turnActive={turnActive}
      startedAt={startedAt}
      durationMs={durationMs}
      retryingMessage={retryingMessage}
      showHeader
      turnId="turn-1"
      activeItemTurnIds={{}}
      mcpProgressByItemId={{}}
    />,
  );
}

function renderEmptyActivity(startedAt: number) {
  return render(
    <TurnActivityGroup
      items={[]}
      active
      turnActive
      startedAt={startedAt}
      durationMs={null}
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
    expect(screen.getByText("正在处理 5s")).toBeTruthy();

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText("正在处理 6s")).toBeTruthy();
  });

  it("renders the processing header before the first activity item", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-14T10:00:05Z"));
    const startedAt = Date.now() / 1_000 - 5;

    renderEmptyActivity(startedAt);
    expect(screen.getByText("正在处理 5s")).toBeTruthy();
    expect(screen.queryByText("正在等待模型响应")).toBeNull();
  });

  it("freezes the final duration after completion", () => {
    renderActivity(false, 100, 8_421);

    expect(screen.getByText("已处理 8s")).toBeTruthy();
  });

  it("keeps a reconnect notice inside the active process status", () => {
    const view = renderActivity(true, Date.now() / 1_000, null, "Reconnecting... 1/5");

    expect(screen.getByText("Reconnecting... 1/5").closest(".turn-work-status")).toBeTruthy();
    view.rerender(
      <TurnActivityGroup
        items={[activity]}
        active={false}
        turnActive={false}
        startedAt={100}
        durationMs={8_000}
        retryingMessage="Reconnecting... 1/5"
        showHeader
        turnId="turn-1"
        activeItemTurnIds={{}}
        mcpProgressByItemId={{}}
      />,
    );
    expect(screen.queryByText("Reconnecting... 1/5")).toBeNull();
  });

  it("clears its timer when removed", () => {
    vi.useFakeTimers();
    const view = renderActivity(true, Date.now() / 1_000, null);
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
