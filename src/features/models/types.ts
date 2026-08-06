export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max" | "ultra";
export type Verbosity = "low" | "medium" | "high";

export interface ModelTemplate {
  id: string;
  label: string;
  family: string;
  description: string;
  contextWindow: number;
  inputModalities: Array<"text" | "image">;
  reasoningEfforts: ReasoningEffort[];
  defaultReasoningEffort: ReasoningEffort | null;
  supportsVerbosity: boolean;
  defaultVerbosity: Verbosity | null;
}

export interface ModelSettings {
  baseUrl: string;
  modelId: string;
  capabilityTemplate: string;
  reasoningEffort: ReasoningEffort | null;
  verbosity: Verbosity | null;
}
