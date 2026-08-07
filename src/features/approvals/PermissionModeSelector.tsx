import { useState } from "react";
import { getPermissionMode, PERMISSION_MODES, type PermissionMode } from "./permissionModes";

interface Props {
  value: PermissionMode;
  disabled?: boolean;
  onChange: (mode: PermissionMode) => void;
}

export function PermissionModeSelector({ value, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = getPermissionMode(value);

  function select(mode: PermissionMode) {
    onChange(mode);
    setOpen(false);
  }

  return (
    <div className="permission-selector">
      <button
        className={`permission-trigger ${value === "full" ? "danger" : ""}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected.icon}</span>
        <strong>{selected.label}</strong>
        <i>⌄</i>
      </button>
      {open && (
        <div className="permission-menu" role="listbox" aria-label="权限模式">
          {PERMISSION_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`${mode.id === value ? "active" : ""} ${mode.id === "full" ? "danger" : ""}`}
              onClick={() => select(mode.id)}
              role="option"
              aria-selected={mode.id === value}
            >
              <span className="permission-icon">{mode.icon}</span>
              <span><strong>{mode.label}</strong><small>{mode.description}</small></span>
              {mode.id === value && <em>✓</em>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
