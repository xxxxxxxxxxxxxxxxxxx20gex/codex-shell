import { useEffect } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { threadTitle } from "./threadPresentation";

export type SessionDestructiveAction = "archive" | "delete";

interface Props {
  action: SessionDestructiveAction;
  thread: Thread;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SessionActionConfirmDialog({ action, thread, onCancel, onConfirm }: Props) {
  const deleting = action === "delete";
  const title = deleting ? "永久删除这个会话？" : "归档这个会话？";
  const description = deleting
    ? "会话记录将被永久删除，此操作无法撤销。"
    : "会话将从本地历史列表移除，但记录仍保留在 Codex Shell 的归档目录中。";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="session-confirmation-title" aria-describedby="session-confirmation-description">
        <span className="eyebrow">需要二次确认</span>
        <h2 id="session-confirmation-title">{title}</h2>
        <strong>{threadTitle(thread)}</strong>
        <p id="session-confirmation-description">{description}</p>
        <footer>
          <button className="secondary-button" type="button" onClick={onCancel} autoFocus>取消</button>
          <button className={deleting ? "primary-button destructive-confirm-button" : "primary-button"} type="button" onClick={onConfirm}>
            {deleting ? "确认永久删除" : "确认归档"}
          </button>
        </footer>
      </section>
    </div>
  );
}
