type ReasoningEffort = string;
export type Verbosity = "low" | "medium" | "high";

export interface ModelSettings {
  baseUrl: string;
  modelId: string;
  reasoningEffort: ReasoningEffort | null;
  verbosity: Verbosity | null;
}
