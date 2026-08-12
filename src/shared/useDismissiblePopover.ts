import { useEffect, useRef } from "react";

interface Options {
  open: boolean;
  onClose: () => void;
  returnFocus?: boolean;
  isInside?: (target: Node) => boolean;
}

/** Adds outside-pointer and Escape dismissal to a popup and restores trigger focus. */
export function useDismissiblePopover<T extends HTMLElement>({ open, onClose, returnFocus = true, isInside }: Options) {
  const rootRef = useRef<T>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const dismissalReasonRef = useRef<"escape" | "outside" | null>(null);
  const onCloseRef = useRef(onClose);
  const isInsideRef = useRef(isInside);
  onCloseRef.current = onClose;
  isInsideRef.current = isInside;

  useEffect(() => {
    if (!open) return;
    dismissalReasonRef.current = null;
    lastFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    function dismissOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target) || isInsideRef.current?.(target)) return;
      dismissalReasonRef.current = "outside";
      onCloseRef.current();
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dismissalReasonRef.current = "escape";
      onCloseRef.current();
    }
    document.addEventListener("pointerdown", dismissOnOutsidePointer, true);
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer, true);
      document.removeEventListener("keydown", dismissOnEscape, true);
      if (returnFocus && dismissalReasonRef.current === "escape" && lastFocusedRef.current?.isConnected) lastFocusedRef.current.focus();
    };
  }, [open, returnFocus]);

  return rootRef;
}
