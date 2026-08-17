import { ListChecks, Target, X } from "lucide-react";
import type { SelectableComposerIntent } from "./composerIntent";

interface Props {
  intent: SelectableComposerIntent;
  onClear: () => void;
}

const PRESENTATION = {
  plan: { icon: ListChecks, label: "计划" },
  goal: { icon: Target, label: "目标" },
} as const;

export function ComposerIntentControl({ intent, onClear }: Props) {
  const presentation = PRESENTATION[intent];
  const Icon = presentation.icon;
  return (
    <button
      type="button"
      className={`composer-intent-button ${intent}`}
      onClick={onClear}
      title={`退出${presentation.label}模式`}
      aria-label={`退出${presentation.label}模式`}
    >
      <span><Icon aria-hidden="true" /></span>
      {presentation.label}
      <i><X aria-hidden="true" /></i>
    </button>
  );
}
