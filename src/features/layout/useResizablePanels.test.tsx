// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DEFAULT_SIDEBAR_WIDTH } from "./panelLayout";
import { useResizablePanels } from "./useResizablePanels";

describe("useResizablePanels", () => {
  it("opens the session sidebar and collapses the inspector by default", () => {
    const { result } = renderHook(useResizablePanels);

    expect(result.current.sidebarOpen).toBe(true);
    expect(result.current.inspectorOpen).toBe(false);
    expect(result.current.workspaceGridStyle).toEqual({
      "--sidebar-width": `${DEFAULT_SIDEBAR_WIDTH}px`,
      "--inspector-width": "0px",
    });
  });
});
