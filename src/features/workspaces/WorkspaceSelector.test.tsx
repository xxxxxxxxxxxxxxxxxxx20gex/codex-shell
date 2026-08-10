import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceSelector } from "./WorkspaceSelector";

function render(path: string | null) {
  return renderToStaticMarkup(
    <WorkspaceSelector
      path={path}
      disabled={false}
      onExplore={vi.fn()}
      onChange={vi.fn()}
      onError={vi.fn()}
    />,
  );
}

describe("WorkspaceSelector", () => {
  it("keeps the managed default workspace out of the left workspace card", () => {
    const markup = render(null);

    expect(markup).toContain("选择工作区");
    expect(markup).not.toContain("workspace-item");
    expect(markup).not.toContain("未选择工作区");
  });

  it("shows a user-selected project and its browse entry", () => {
    const markup = render("C:\\work\\project");

    expect(markup).toContain("workspace-item");
    expect(markup).toContain("project");
    expect(markup).toContain("C:\\work\\project");
    expect(markup).toContain("更换工作区");
  });
});
