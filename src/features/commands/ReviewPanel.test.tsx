// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewPanel } from "./ReviewPanel";

afterEach(cleanup);

describe("ReviewPanel", () => {
  it("offers native review targets and delivery modes", () => {
    render(
      <ReviewPanel startReview={vi.fn()} onStarted={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByText("当前未提交修改")).toBeTruthy();
    expect(screen.getByText("相对基础分支")).toBeTruthy();
    expect(screen.getByText("指定 Commit")).toBeTruthy();
    expect(screen.getByText("独立 Review Session")).toBeTruthy();
  });

  it("builds a detached custom review request", async () => {
    const startReview = vi.fn(async () => true);
    const onStarted = vi.fn();
    render(<ReviewPanel startReview={startReview} onStarted={onStarted} onClose={vi.fn()} />);

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "custom" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "focus on lifecycle" } });
    fireEvent.change(selects[1], { target: { value: "detached" } });
    fireEvent.click(screen.getByRole("button", { name: "开始审查" }));

    await waitFor(() => expect(startReview).toHaveBeenCalledWith(
      { type: "custom", instructions: "focus on lifecycle" },
      "detached",
    ));
    expect(onStarted).toHaveBeenCalledWith("detached");
  });
});
