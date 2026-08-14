// @vitest-environment happy-dom

import { cleanup, fireEvent, render as renderDom, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSelector } from "./WorkspaceSelector";

afterEach(cleanup);

function render(path: string | null, selectionLocked = false) {
  return renderToStaticMarkup(
    <WorkspaceSelector
      path={path}
      disabled={false}
      selectionLocked={selectionLocked}
      onExplore={vi.fn()}
      onChange={vi.fn()}
      onError={vi.fn()}
    />,
  );
}

describe("WorkspaceSelector", () => {
  it("keeps the managed default workspace out of the left workspace card", () => {
    const markup = render(null);

    expect(markup).toContain("选择项目");
    expect(markup).not.toContain("workspace-item");
    expect(markup).not.toContain("未选择项目");
  });

  it("shows a user-selected project and its browse entry", () => {
    const markup = render("C:\\work\\project");

    expect(markup).toContain("workspace-item");
    expect(markup).toContain("project");
    expect(markup).toContain("C:\\work\\project");
    expect(markup).toContain("切换项目");
    expect(markup).toContain("取消自定义项目");
  });

  it("cancels a custom project before the conversation starts", () => {
    const onChange = vi.fn();
    renderDom(
      <WorkspaceSelector
        path="C:\\work\\project"
        disabled={false}
        selectionLocked={false}
        onExplore={vi.fn()}
        onChange={onChange}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("取消自定义项目"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("keeps an existing Session project browsable but prevents changing it", () => {
    const markup = render("C:\\work\\project", true);

    expect(markup).toContain("workspace-item");
    expect(markup).not.toContain("切换项目");
    expect(markup).not.toContain("取消自定义项目");
  });
});
