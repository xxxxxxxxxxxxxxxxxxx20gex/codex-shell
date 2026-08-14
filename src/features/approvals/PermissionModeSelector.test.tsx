// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PermissionModeSelector } from "./PermissionModeSelector";

afterEach(cleanup);

function renderSelector(value: "read" | "workspace" | "full" = "workspace") {
  const onChange = vi.fn();
  const onReviewerChange = vi.fn();
  render(
    <PermissionModeSelector
      value={value}
      reviewer="user"
      onChange={onChange}
      onReviewerChange={onReviewerChange}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: new RegExp(value === "read" ? "只读" : value === "workspace" ? "工作区写入" : "完全访问") }));
  return { onChange, onReviewerChange };
}

describe("PermissionModeSelector", () => {
  it("shows the three native sandbox access levels", () => {
    renderSelector();

    expect(screen.getByRole("menuitemradio", { name: /只读/ })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: /工作区写入/ })).toBeTruthy();
    expect(screen.getByRole("menuitemradio", { name: /完全访问/ })).toBeTruthy();
    expect(screen.queryByText("请求批准")).toBeNull();
    expect(screen.queryByText("替我审批")).toBeNull();
  });

  it("selects a sandbox level independently", () => {
    const { onChange } = renderSelector();

    fireEvent.click(screen.getByRole("menuitemradio", { name: /只读/ }));
    expect(onChange).toHaveBeenCalledWith("read");
  });

  it("offers automatic review only when approvals can occur", () => {
    const { onReviewerChange } = renderSelector();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /自动风险审查/ }));
    expect(onReviewerChange).toHaveBeenCalledWith("auto_review");

    cleanup();
    renderSelector("full");
    expect(screen.queryByRole("menuitemcheckbox", { name: /自动风险审查/ })).toBeNull();
  });
});
