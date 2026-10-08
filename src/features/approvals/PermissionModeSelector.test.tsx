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

  it("focuses the current mode and supports arrow navigation and focus return", () => {
    const { onChange } = renderSelector();
    const trigger = screen.getByRole("button", { name: /工作区写入/ });
    const menu = screen.getByRole("menu");
    expect(document.activeElement).toBe(screen.getByRole("menuitemradio", { name: /工作区写入/ }));

    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement).toBe(screen.getAllByRole("menuitemradio")[0]);
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitemcheckbox", { name: /自动风险审查/ }));

    fireEvent.click(screen.getByRole("menuitemradio", { name: /只读/ }));
    expect(onChange).toHaveBeenCalledWith("read");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
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
