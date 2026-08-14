import { useState } from "react";
import {
  getPermissionMode,
  PERMISSION_MODES,
  type ApprovalReviewerMode,
  type PermissionMode,
} from "./permissionModes";
import { useDismissiblePopover } from "../../shared/useDismissiblePopover";

interface Props {
  value: PermissionMode;
  reviewer: ApprovalReviewerMode;
  disabled?: boolean;
  onChange: (mode: PermissionMode) => void;
  onReviewerChange: (reviewer: ApprovalReviewerMode) => void;
}

function PermissionIcon({ mode }: { mode: PermissionMode }) {
  if (mode === "workspace") {
    return <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M3.25 7.25v7.5a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2H10L8.25 4h-3a2 2 0 0 0-2 2z" />
      <path d="m8 13 5-5 1.5 1.5-5 5-2 .5z" />
    </svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 20 20">
    <path d="M10 2.75 16 5v4.25c0 4-2.45 6.6-6 8-3.55-1.4-6-4-6-8V5z" />
    {mode === "read"
      ? <path d="m7.25 10 1.75 1.75 3.75-4" />
      : <path d="M10 7v4m0 2.5h.01" />}
  </svg>;
}

export function PermissionModeSelector({ value, reviewer, disabled, onChange, onReviewerChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useDismissiblePopover<HTMLDivElement>({ open, onClose: () => setOpen(false) });
  const selected = getPermissionMode(value);

  function select(mode: PermissionMode) {
    onChange(mode);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="permission-selector">
      <button
        className={`permission-trigger ${value === "full" ? "danger" : ""}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="permission-icon"><PermissionIcon mode={value} /></span>
        <strong>{selected.label}</strong>
        <svg className="chevron-icon" aria-hidden="true" viewBox="0 0 12 12"><path d="m3.5 4.5 2.5 2.5 2.5-2.5" /></svg>
      </button>
      {open && (
        <div className="permission-menu" role="menu" aria-label="权限模式">
          {PERMISSION_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`${mode.id === value ? "active" : ""} ${mode.id === "full" ? "danger" : ""}`}
              onClick={() => select(mode.id)}
              role="menuitemradio"
              aria-checked={mode.id === value}
            >
              <span className="permission-icon"><PermissionIcon mode={mode.id} /></span>
              <span><strong>{mode.label}</strong><small>{mode.description}</small></span>
              {mode.id === value && <em>✓</em>}
            </button>
          ))}
          {value !== "full" && <button
            type="button"
            className="permission-reviewer-toggle"
            role="menuitemcheckbox"
            aria-checked={reviewer === "auto_review"}
            onClick={() => onReviewerChange(reviewer === "user" ? "auto_review" : "user")}
          >
            <span className="permission-reviewer-icon" aria-hidden="true">◇</span>
            <span><strong>自动风险审查</strong><small>由 Codex 审查受保护操作，而不是每次询问你</small></span>
            <i className={reviewer === "auto_review" ? "active" : ""} aria-hidden="true"><b /></i>
          </button>}
        </div>
      )}
    </div>
  );
}
