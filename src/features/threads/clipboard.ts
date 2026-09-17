export async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // WebView clipboard permissions can be unavailable, so use the legacy local fallback.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  try {
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("无法写入剪贴板");
  } finally {
    textarea.remove();
    previousFocus?.focus();
  }
}
