import type { KeyboardEvent } from "react";

/** Moves focus between enabled menu items with Up/Down (wrapping), Home and End. Returns true when handled. */
export function moveMenuFocus(event: KeyboardEvent, menu: HTMLElement) {
  const items = Array.from(menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  if (items.length === 0) return false;
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "ArrowDown" ? (index + 1) % items.length
    : event.key === "ArrowUp" ? (index - 1 + items.length) % items.length
      : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
  if (next < 0) return false;
  event.preventDefault();
  items[next].focus();
  return true;
}
