import { useEffect } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { threadTitle } from "./threadPresentation";

interface Props {
  thread: Thread;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SessionActionConfirmDialog({ thread, onCancel, onConfirm }: Props) {
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
        <h2 id="session-confirmation-title">永久删除这个会话？</h2>
        <strong>{threadTitle(thread)}</strong>
        <p id="session-confirmation-description">会话记录将被永久删除，此操作无法撤销。</p>
        <footer>
          <button className="secondary-button" type="button" onClick={onCancel} autoFocus>取消</button>
          <button className="primary-button destructive-confirm-button" type="button" onClick={onConfirm}>
            确认永久删除
          </button>
        </footer>
      </section>
    </div>
  );
}
