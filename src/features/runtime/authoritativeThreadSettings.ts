import type { ThreadSettings } from "../../generated/app-server/v2/ThreadSettings";
import type { ApprovalReviewerMode, PermissionMode } from "../approvals/permissionModes";
import type { ModelSettings, ServiceTier } from "../models/types";

function serviceTierFromThread(value: string | null): ServiceTier {
  return value === "priority" || value === "flex" ? value : "default";
}

export function modelSettingsFromThread(
  current: ModelSettings,
  authoritative: ThreadSettings,
): ModelSettings {
  return {
    ...current,
    modelId: authoritative.model,
    reasoningEffort: authoritative.effort,
    reasoningSummary: authoritative.summary,
    serviceTier: serviceTierFromThread(authoritative.serviceTier),
  };
}

export function permissionModeFromThread(authoritative: ThreadSettings): PermissionMode {
  if (authoritative.sandboxPolicy.type === "dangerFullAccess") return "full";
  if (authoritative.sandboxPolicy.type === "workspaceWrite") return "workspace";
  return "read";
}

export function approvalReviewerFromThread(
  authoritative: ThreadSettings,
): ApprovalReviewerMode {
  return authoritative.approvalsReviewer === "auto_review" ? "auto_review" : "user";
}
