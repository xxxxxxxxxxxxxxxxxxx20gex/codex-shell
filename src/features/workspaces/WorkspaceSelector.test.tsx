// @vitest-environment happy-dom

import { cleanup, fireEvent, render as renderDom, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSelector } from "./WorkspaceSelector";

afterEach(cleanup);

function render(path: string | null, disabled = false) {
  return renderToStaticMarkup(
    <WorkspaceSelector
      path={path}
      disabled={disabled}
      onChange={vi.fn()}
      onError={vi.fn()}
    />,
  );
}

describe("WorkspaceSelector", () => {
  it("offers project selection above a new conversation composer", () => {
    const markup = render(null);

    expect(markup).toContain("composer-workspace-selector");
    expect(markup).toContain("选择项目");
    expect(markup).not.toContain("未选择项目");
  });

  it("shows the selected project name and keeps the full path in its tooltip", () => {
    const markup = render("C:\\work\\project");

    expect(markup).toContain("project");
    expect(markup).toContain("点击切换项目");
    expect(markup).toContain("取消自定义项目");
  });

  it("cancels a custom project before the conversation starts", () => {
    const onChange = vi.fn();
    renderDom(
      <WorkspaceSelector
        path="C:\\work\\project"
        disabled={false}
        onChange={onChange}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("取消自定义项目"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("disables project changes while the new conversation is being submitted", () => {
    const markup = render("C:\\work\\project", true);

    expect((markup.match(/disabled=""/g) ?? []).length).toBe(2);
  });
});
