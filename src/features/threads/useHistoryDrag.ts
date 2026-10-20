import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { isThreadPinned } from "./threadPresentation";

interface DropTarget { id: string; after: boolean }
interface Drag {
  id: string; pointer: number; x: number; y: number; currentY: number;
  active: boolean; button: HTMLButtonElement; target: DropTarget | null;
}

export function useHistoryDrag(threads: Thread[], enabled: boolean, move: (source: string, target: string, after: boolean) => void) {
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [active, setActive] = useState(false);
  const cancel = useCallback(() => {
    const current = drag.current;
    drag.current = null;
    if (current?.button.hasPointerCapture(current.pointer)) current.button.releasePointerCapture(current.pointer);
    setTarget(null);
    setActive(false);
  }, []);

  const locate = useCallback((current: Drag, x: number, y: number) => {
    const row = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-history-thread]");
    const list = current.button.closest(".thread-list");
    const source = threads.find((thread) => thread.id === current.id);
    const destination = threads.find((thread) => thread.id === row?.dataset.historyThread);
    let next: DropTarget | null = null;
    if (row && list?.contains(row) && source && destination && source.id !== destination.id && isThreadPinned(source) === isThreadPinned(destination)) {
      const bounds = row.getBoundingClientRect();
      next = { id: destination.id, after: y >= bounds.top + bounds.height / 2 };
    }
    current.target = next;
    setTarget(next);
  }, [threads]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("keydown", keydown);
    window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("keydown", keydown); window.removeEventListener("blur", cancel); };
  }, [cancel]);

  useEffect(() => {
    if (!active || !enabled) return;
    let frame: number;
    const scroll = () => {
      const current = drag.current;
      const list = current?.button.closest(".thread-list");
      if (current && list) {
        const bounds = list.getBoundingClientRect();
        const delta = current.currentY < bounds.top + 28 ? -6 : current.currentY > bounds.bottom - 28 ? 6 : 0;
        if (delta) { list.scrollTop += delta; locate(current, current.x, current.currentY); }
      }
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [active, enabled, locate]);

  function pointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    suppressClick.current = false;
    if (!enabled || event.button !== 0 || !event.isPrimary) return;
    drag.current = { id, pointer: event.pointerId, x: event.clientX, y: event.clientY, currentY: event.clientY, active: false, button: event.currentTarget, target: null };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (!enabled) { cancel(); return; }
    if (!current.active && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
    current.active = true;
    suppressClick.current = true;
    current.x = event.clientX;
    current.currentY = event.clientY;
    setActive(true);
    locate(current, event.clientX, event.clientY);
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    if (enabled && current.active) {
      locate(current, event.clientX, event.clientY);
      if (current.target) move(current.id, current.target.id, current.target.after);
    }
    cancel();
  }

  return { target: enabled ? target : null, cancel, pointerDown, pointerMove, pointerUp,
    consumeClick: () => { const suppressed = suppressClick.current; suppressClick.current = false; return suppressed; } };
}
