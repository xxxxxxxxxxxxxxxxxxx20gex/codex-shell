import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./ContextMenu.css";

export interface ContextMenuAction {
  label: string;
  icon: ReactNode;
  run: () => void | Promise<void>;
}

export function ContextMenu({ x, y, actions, anchor, onClose, onError, label }: {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  label: string;
  anchor: HTMLElement;
  onClose: () => void;
  onError: (error: unknown) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const menu = ref.current!;
    const bounds = menu.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8)), top: Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8)) });
  }, [x, y, actions.length]);
  useLayoutEffect(() => {
    const menu = ref.current!;
    menu.querySelector<HTMLButtonElement>("button")?.focus();
    const outside = (event: PointerEvent) => { if (!menu.contains(event.target as Node)) onClose(); };
    const dismiss = () => onClose();
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", dismiss);
    };
  }, [x, y, onClose]);

  return createPortal(<div ref={ref} className="explorer-context-menu" role="menu" aria-label={label} style={position} onContextMenu={(event) => event.preventDefault()} onKeyDown={(event) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      anchor.focus();
      onClose();
      return;
    }
    const buttons = Array.from(ref.current!.querySelectorAll<HTMLButtonElement>("button"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "ArrowDown" ? (index + 1) % buttons.length
      : event.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length
        : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); buttons[next].focus(); }
  }}>
    {actions.map((action) => <button type="button" role="menuitem" key={action.label} onClick={async () => {
      anchor.focus();
      onClose();
      try { await action.run(); } catch (error) { onError(error); }
    }}>{action.icon}<span>{action.label}</span></button>)}
  </div>, document.body);
}
