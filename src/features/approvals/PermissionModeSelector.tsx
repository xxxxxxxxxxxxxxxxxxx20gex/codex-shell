import { useState } from "react";
import {
  Check,
  ChevronDown,
  FolderPen,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
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
  if (mode === "workspace") return <FolderPen aria-hidden="true" />;
  if (mode === "read") return <ShieldCheck aria-hidden="true" />;
  return <ShieldAlert aria-hidden="true" />;
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
        <ChevronDown className="chevron-icon" aria-hidden="true" />
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
              {mode.id === value && <em><Check aria-hidden="true" /></em>}
            </button>
          ))}
          {value !== "full" && <button
            type="button"
            className="permission-reviewer-toggle"
            role="menuitemcheckbox"
            aria-checked={reviewer === "auto_review"}
            onClick={() => onReviewerChange(reviewer === "user" ? "auto_review" : "user")}
          >
            <span className="permission-reviewer-icon"><ScanSearch aria-hidden="true" /></span>
            <span><strong>自动风险审查</strong><small>由 Codex 审查受保护操作，而不是每次询问你</small></span>
            <i className={reviewer === "auto_review" ? "active" : ""} aria-hidden="true"><b /></i>
          </button>}
        </div>
      )}
    </div>
  );
}
