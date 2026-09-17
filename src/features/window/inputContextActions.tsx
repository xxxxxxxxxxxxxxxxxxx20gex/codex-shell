import { ClipboardPaste, Copy, TextSelect } from "lucide-react";
import type { ContextMenuAction } from "../../shared/ContextMenu";
import { writeClipboardText } from "../threads/clipboard";

export function inputContextActions(target: HTMLElement): ContextMenuAction[] {
  const input = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ? target : null;
  const start = input?.selectionStart ?? null;
  const end = input?.selectionEnd ?? null;
  const value = input?.value ?? target.textContent;
  const selection = window.getSelection();
  const range = !input && selection?.rangeCount && target.contains(selection.anchorNode) && target.contains(selection.focusNode)
    ? selection.getRangeAt(0).cloneRange() : null;
  const text = input ? (start !== null && end !== null ? input.value.slice(start, end) : "") : range?.toString() ?? "";
  const restore = () => {
    target.focus();
    if (input && start !== null && end !== null) input.setSelectionRange(start, end);
    else if (range) { selection!.removeAllRanges(); selection!.addRange(range); }
  };
  return [
    { label: "全选", icon: <TextSelect aria-hidden="true" />, run: () => {
      target.focus();
      if (input) input.select();
      else {
        const all = document.createRange(); all.selectNodeContents(target);
        selection!.removeAllRanges(); selection!.addRange(all);
      }
    } },
    { label: "复制", icon: <Copy aria-hidden="true" />, disabled: !text || (input instanceof HTMLInputElement && input.type === "password"),
      run: () => writeClipboardText(text) },
    { label: "粘贴", icon: <ClipboardPaste aria-hidden="true" />, disabled: input?.readOnly, run: async () => {
      const data = new DataTransfer();
      try {
        if (navigator.clipboard.read) {
          for (const item of await navigator.clipboard.read()) {
            for (const type of item.types) {
              if (type === "text/plain") data.setData(type, await (await item.getType(type)).text());
              else if (type.startsWith("image/")) data.items.add(new File([await item.getType(type)], "clipboard-image", { type }));
            }
          }
        } else data.setData("text/plain", await navigator.clipboard.readText());
      } catch { throw new Error("无法读取剪贴板，请使用 Ctrl+V 粘贴"); }
      if (!target.isConnected || input?.disabled || input?.readOnly || (input ? input.value : target.textContent) !== value) throw new Error("输入状态已变化，请重新选择粘贴位置");
      restore();
      // Preserve the composer's image-paste handler before inserting plain text.
      if (!target.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }))) return;
      const pasted = data.getData("text/plain");
      if (!pasted) return;
      // Chromium's editing command updates React inputs and retains native undo history.
      if (!document.execCommand("insertText", false, pasted)) throw new Error("无法插入文本，请使用 Ctrl+V 粘贴");
    } },
  ];
}
