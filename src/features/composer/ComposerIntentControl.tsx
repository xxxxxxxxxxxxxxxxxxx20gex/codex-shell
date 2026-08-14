import type { SelectableComposerIntent } from "./composerIntent";

interface Props {
  intent: SelectableComposerIntent;
  onClear: () => void;
}

const PRESENTATION = {
  plan: { icon: "☷", label: "计划" },
  goal: { icon: "◎", label: "目标" },
} as const;

export function ComposerIntentControl({ intent, onClear }: Props) {
  const presentation = PRESENTATION[intent];
  return (
    <button
      type="button"
      className={`composer-intent-button ${intent}`}
      onClick={onClear}
      title={`退出${presentation.label}模式`}
      aria-label={`退出${presentation.label}模式`}
    >
      <span aria-hidden="true">{presentation.icon}</span>
      {presentation.label}
      <i aria-hidden="true">×</i>
    </button>
  );
}

