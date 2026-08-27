export type ResizablePanel = "sidebar" | "inspector";

export const DEFAULT_SIDEBAR_WIDTH = 248;
export const DEFAULT_INSPECTOR_WIDTH = 288;
export const THREE_PANEL_BREAKPOINT = 1180;
export const COMPACT_OVERLAY_BREAKPOINT = 900;

const MIN_CONVERSATION_WIDTH = 440;
const PANEL_LIMITS: Record<ResizablePanel, { minimum: number; maximum: number }> = {
  sidebar: { minimum: 200, maximum: 420 },
  inspector: { minimum: 240, maximum: 760 },
};

interface WorkspaceBounds {
  left: number;
  right: number;
  width: number;
}

export function resizedPanelWidth(
  panel: ResizablePanel,
  pointerX: number,
  bounds: WorkspaceBounds,
  oppositePanelWidth: number,
) {
  const limits = PANEL_LIMITS[panel];
  const desiredWidth = panel === "sidebar" ? pointerX - bounds.left : bounds.right - pointerX;
  const availableMaximum = Math.min(
    limits.maximum,
    bounds.width - oppositePanelWidth - MIN_CONVERSATION_WIDTH,
  );
  return Math.min(
    Math.max(desiredWidth, limits.minimum),
    Math.max(limits.minimum, availableMaximum),
  );
}
