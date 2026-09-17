import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { ContextMenu } from "../../shared/ContextMenu";
import { writeClipboardText } from "../threads/clipboard";
import { errorMessage } from "../../shared/errors";
import { TransientNotice } from "../../shared/TransientNotice";

export function ContextMenuPolicy() {
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string; anchor: HTMLElement } | null>(null);
  const [error, setError] = useState("");
  const close = useCallback(() => setSelectionMenu(null), []);
  const dismissError = useCallback(() => setError(""), []);
  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      if (event.defaultPrevented) return;
      setSelectionMenu(null);
      setError("");
      const target = event.target;
      if (!(target instanceof HTMLElement)) { event.preventDefault(); return; }
      const input = target.closest("input, textarea");
      if ((input instanceof HTMLTextAreaElement && !input.disabled)
        || (input instanceof HTMLInputElement && !input.disabled && ["text", "search", "url", "tel", "email", "password", "number"].includes(input.type))
        || target.isContentEditable) return;
      event.preventDefault();
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim() || !selection.containsNode(target, true)) return;
      if ((event.clientX || event.clientY) && !Array.from(selection.getRangeAt(0).getClientRects()).some((rect) =>
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)) return;
      const bounds = target.getBoundingClientRect();
      setSelectionMenu({
        x: event.clientX || bounds.left,
        y: event.clientY || bounds.bottom,
        text: selection.toString(),
        anchor: document.activeElement instanceof HTMLElement ? document.activeElement : target,
      });
    }
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);
  return <>
    {selectionMenu && <ContextMenu label="文本操作" {...selectionMenu} onClose={close} onError={(cause) => setError(errorMessage(cause))}
      actions={[{ label: "复制", icon: <Copy aria-hidden="true" />, run: () => writeClipboardText(selectionMenu.text) }]} />}
    <TransientNotice message={error} onDismiss={dismissError} />
  </>;
}
