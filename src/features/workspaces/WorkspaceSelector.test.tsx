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
  });
});
