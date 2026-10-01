import { useRef, type RefObject } from "react";
import { GripHorizontal } from "lucide-react";
import { CompactIconButton } from "../../shared/CompactIconButton";

export function ComposerResizeHandle({ inputRef }: { inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const drag = useRef<{ y: number; height: number } | null>(null);

  function resize(height: number) {
    const input = inputRef.current;
    if (!input) return;
    const style = getComputedStyle(input);
    input.style.height = `${Math.max(parseFloat(style.minHeight), Math.min(parseFloat(style.maxHeight), height))}px`;
    input.dataset.manualHeight = "true";
  }

  return <CompactIconButton
    className="composer-resize-handle"
    label="调整输入框高度"
    title="向上拖动增高，向下拖动缩小；也可使用上下方向键"
    icon={<GripHorizontal aria-hidden="true" />}
    onPointerDown={(event) => {
      if (event.button !== 0 || !inputRef.current) return;
      event.preventDefault();
      event.currentTarget.focus();
      drag.current = { y: event.clientY, height: inputRef.current.getBoundingClientRect().height };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (drag.current) resize(drag.current.height + drag.current.y - event.clientY);
    }}
    onPointerUp={(event) => {
      drag.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { drag.current = null; }}
    onLostPointerCapture={() => { drag.current = null; }}
    onKeyDown={(event) => {
      if (event.key === "Escape" && drag.current) {
        resize(drag.current.height);
        drag.current = null;
        event.preventDefault();
      }
      if ((event.key === "ArrowUp" || event.key === "ArrowDown") && inputRef.current) {
        event.preventDefault();
        resize(inputRef.current.getBoundingClientRect().height + (event.key === "ArrowUp" ? 16 : -16));
      }
    }}
  />;
}
