import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import {
  COMPACT_OVERLAY_BREAKPOINT,
  DEFAULT_INSPECTOR_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  resizedPanelWidth,
  THREE_PANEL_BREAKPOINT,
  type ResizablePanel,
} from "./panelLayout";

type WorkspaceGridStyle = CSSProperties & {
  "--sidebar-width": string;
  "--inspector-width": string;
};

export function useResizablePanels() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const [resizingPanel, setResizingPanel] = useState<ResizablePanel | null>(null);
  const sidebarWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  const inspectorWidthRef = useRef(DEFAULT_INSPECTOR_WIDTH);
  const workspaceGridRef = useRef<HTMLElement>(null);
  const resizingPanelRef = useRef<ResizablePanel | null>(null);
  const pendingResizeRef = useRef<{ panel: ResizablePanel; clientX: number } | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  function applyResize(panel: ResizablePanel, clientX: number) {
    const bounds = workspaceGridRef.current?.getBoundingClientRect();
    if (!bounds) return;
    if (panel === "sidebar") {
      const oppositeWidth = inspectorOpen && bounds.width >= THREE_PANEL_BREAKPOINT ? inspectorWidth : 0;
      const width = resizedPanelWidth(panel, clientX, bounds, oppositeWidth);
      sidebarWidthRef.current = width;
      workspaceGridRef.current?.style.setProperty("--sidebar-width", `${width}px`);
      return;
    }

    const oppositeWidth = sidebarOpen && bounds.width >= COMPACT_OVERLAY_BREAKPOINT ? sidebarWidth : 0;
    const width = resizedPanelWidth(panel, clientX, bounds, oppositeWidth);
    inspectorWidthRef.current = width;
    workspaceGridRef.current?.style.setProperty("--inspector-width", `${width}px`);
  }

  function flushResize() {
    const pending = pendingResizeRef.current;
    pendingResizeRef.current = null;
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    }
    if (pending) applyResize(pending.panel, pending.clientX);
  }

  function beginPanelResize(event: PointerEvent<HTMLDivElement>, panel: ResizablePanel) {
    if (event.button !== 0) return;
    event.preventDefault();
    resizingPanelRef.current = panel;
    setResizingPanel(panel);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizePanel(event: PointerEvent<HTMLDivElement>, panel: ResizablePanel) {
    if (resizingPanelRef.current !== panel) return;
    pendingResizeRef.current = { panel, clientX: event.clientX };
    if (resizeFrameRef.current === null) {
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        const pending = pendingResizeRef.current;
        pendingResizeRef.current = null;
        if (pending) applyResize(pending.panel, pending.clientX);
      });
    }
  }

  function finishPanelResize(event: PointerEvent<HTMLDivElement>) {
    flushResize();
    setSidebarWidth(sidebarWidthRef.current);
    setInspectorWidth(inspectorWidthRef.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resizingPanelRef.current = null;
    setResizingPanel(null);
  }

  useEffect(() => () => {
    pendingResizeRef.current = null;
    if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current);
  }, []);

  useEffect(() => { sidebarWidthRef.current = sidebarWidth; }, [sidebarWidth]);
  useEffect(() => { inspectorWidthRef.current = inspectorWidth; }, [inspectorWidth]);

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
