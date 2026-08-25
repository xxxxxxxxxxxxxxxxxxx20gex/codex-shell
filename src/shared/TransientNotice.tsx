import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  message: string;
  onDismiss: () => void;
  timeoutMs?: number;
  tone?: "danger" | "success";
}

export function TransientNotice({ message, onDismiss, timeoutMs = 5000, tone = "danger" }: Props) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onDismiss, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss, timeoutMs]);

  if (!message) return null;
  return (
    <div className={`transient-notice transient-notice-${tone}`} role="alert">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="关闭提示" title="关闭提示">
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
