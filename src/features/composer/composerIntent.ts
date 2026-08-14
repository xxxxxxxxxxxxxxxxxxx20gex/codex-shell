import type { ModeKind } from "../../generated/app-server/ModeKind";

export type ComposerIntent = "default" | "plan" | "goal";
export type SelectableComposerIntent = Exclude<ComposerIntent, "default">;

export function toggleComposerIntent(
  current: ComposerIntent,
  selected: SelectableComposerIntent,
): ComposerIntent {
  return current === selected ? "default" : selected;
}

export function collaborationModeForIntent(intent: ComposerIntent): ModeKind {
  return intent === "plan" ? "plan" : "default";
}

