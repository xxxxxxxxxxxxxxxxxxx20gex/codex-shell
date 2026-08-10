import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  DEFAULT_INSPECTOR_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  resizedPanelWidth,
  type ResizablePanel,
} from "./panelLayout";

type WorkspaceGridStyle = CSSProperties & {
  "--sidebar-width": string;
  "--inspector-width": string;
};

export function useResizablePanels() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const [resizingPanel, setResizingPanel] = useState<ResizablePanel | null>(null);
  const workspaceGridRef = useRef<HTMLElement>(null);
  const resizingPanelRef = useRef<ResizablePanel | null>(null);

  function beginPanelResize(event: PointerEvent<HTMLDivElement>, panel: ResizablePanel) {
    if (event.button !== 0) return;
    event.preventDefault();
    resizingPanelRef.current = panel;
    setResizingPanel(panel);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizePanel(event: PointerEvent<HTMLDivElement>, panel: ResizablePanel) {
    if (resizingPanelRef.current !== panel) return;
    const bounds = workspaceGridRef.current?.getBoundingClientRect();
    if (!bounds) return;
    if (panel === "sidebar") {
      const oppositeWidth = inspectorOpen && bounds.width > 1040 ? inspectorWidth : 0;
      setSidebarWidth(resizedPanelWidth(panel, event.clientX, bounds, oppositeWidth));
      return;
    }

    const oppositeWidth = sidebarOpen && bounds.width > 720 ? sidebarWidth : 0;
    setInspectorWidth(resizedPanelWidth(panel, event.clientX, bounds, oppositeWidth));
  }

  function finishPanelResize(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizingPanelRef.current = null;
    setResizingPanel(null);
  }

  const workspaceGridStyle = {
    "--sidebar-width": sidebarOpen ? `${sidebarWidth}px` : "0px",
    "--inspector-width": inspectorOpen ? `${inspectorWidth}px` : "0px",
  } as WorkspaceGridStyle;

  return {
    workspaceGridRef,
    workspaceGridStyle,
    sidebarOpen,
    setSidebarOpen,
    inspectorOpen,
    setInspectorOpen,
    sidebarWidth,
    inspectorWidth,
    resizingPanel,
    beginPanelResize,
    resizePanel,
    finishPanelResize,
  };
}
