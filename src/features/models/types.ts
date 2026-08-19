import type { ReasoningSummary } from "../../generated/app-server/ReasoningSummary";

type ReasoningEffort = string;
export type Verbosity = "low" | "medium" | "high";
export type ServiceTier = "default" | "priority" | "flex";

export interface ModelSettings {
  baseUrl: string;
  modelId: string;
  reasoningEffort: ReasoningEffort | null;
  reasoningSummary: ReasoningSummary | null;
  verbosity: Verbosity | null;
  serviceTier: ServiceTier;
}

export type ThemePreference = "dark" | "light" | "system";

export interface PersonalizationSettings {
  customInstructions: string;
  theme: ThemePreference;
}
