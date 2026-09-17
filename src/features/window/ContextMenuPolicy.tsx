import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { ContextMenu, type ContextMenuAction } from "../../shared/ContextMenu";
import { inputContextActions } from "./inputContextActions";
import { writeClipboardText } from "../threads/clipboard";
import { errorMessage } from "../../shared/errors";
import { TransientNotice } from "../../shared/TransientNotice";
import { resolveAbsoluteLinkedPath } from "../workspaces/workspaceState";

export function ContextMenuPolicy({ projectPath }: { projectPath?: string | null }) {
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; actions: ContextMenuAction[]; anchor: HTMLElement } | null>(null);
  const [error, setError] = useState("");
  const close = useCallback(() => setSelectionMenu(null), []);
  const dismissError = useCallback(() => setError(""), []);
  useEffect(() => {
    function handleContextMenu(event: MouseEvent) {
      if (event.defaultPrevented) return;
      setSelectionMenu(null);
      setError("");
      const target = event.target;
      if (!(target instanceof Element)) { event.preventDefault(); return; }
      const resource = target.closest<HTMLElement>("[data-local-path]");
      if (resource) {
        event.preventDefault();
        const path = resource.dataset.localPath!;
        const resolved = projectPath || /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(path)
          ? resolveAbsoluteLinkedPath(projectPath ?? "", path) : null;
        const bounds = resource.getBoundingClientRect();
        setSelectionMenu({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom, anchor: resource.querySelector<HTMLElement>("a, button") ?? resource, actions: [{
          label: "复制绝对路径", icon: <Copy aria-hidden="true" />, run: async () => {
            if (!resolved) throw new Error("无法解析文件绝对路径，请确认当前会话项目与文件链接");
            await writeClipboardText(resolved);
          },
        }] });
        return;
      }
      if (!(target instanceof HTMLElement)) { event.preventDefault(); return; }
      const input = target.closest("input, textarea");
      event.preventDefault();
      const bounds = target.getBoundingClientRect();
      if ((input instanceof HTMLTextAreaElement && !input.disabled)
        || (input instanceof HTMLInputElement && !input.disabled && ["text", "search", "url", "tel", "email", "password", "number"].includes(input.type))
        || target.isContentEditable) {
        let editor = input instanceof HTMLElement ? input : target;
        while (editor.parentElement?.isContentEditable) editor = editor.parentElement;
        setSelectionMenu({ x: event.clientX || bounds.left, y: event.clientY || bounds.bottom, anchor: editor, actions: inputContextActions(editor) });
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim() || !selection.containsNode(target, true)) return;
      if ((event.clientX || event.clientY) && !Array.from(selection.getRangeAt(0).getClientRects()).some((rect) =>
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)) return;
      const text = selection.toString();
      setSelectionMenu({
        x: event.clientX || bounds.left,
        y: event.clientY || bounds.bottom,
        actions: [{ label: "复制", icon: <Copy aria-hidden="true" />, run: () => writeClipboardText(text) }],
        anchor: document.activeElement instanceof HTMLElement ? document.activeElement : target,
      });
    }
    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [projectPath]);
  return <>
    {selectionMenu && <ContextMenu label="文本操作" {...selectionMenu} onClose={close} onError={(cause) => setError(errorMessage(cause))} />}
    <TransientNotice message={error} onDismiss={dismissError} />
  </>;
}
