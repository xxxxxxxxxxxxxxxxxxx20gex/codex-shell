// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThreadGoal } from "../../generated/app-server/v2/ThreadGoal";
import { ComposerGoalStatus } from "./ComposerGoalStatus";

afterEach(cleanup);

const goal: ThreadGoal = {
  threadId: "thread-1",
  objective: "完成权威状态接入",
  status: "active",
  tokenBudget: null,
  tokensUsed: 0,
  timeUsedSeconds: 0,
  createdAt: 1,
  updatedAt: 1,
};

describe("ComposerGoalStatus", () => {
  it("shows the authoritative objective and clears it through one action", () => {
    const onClear = vi.fn();
    render(<ComposerGoalStatus goal={goal} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "清除当前目标：完成权威状态接入" }));

    expect(screen.getByText("目标：完成权威状态接入")).toBeTruthy();
    expect(screen.getByText("进行中")).toBeTruthy();
    expect(onClear).toHaveBeenCalledOnce();
  });
});
