import type { ThreadSettings } from "../../generated/app-server/v2/ThreadSettings";
import type { ApprovalReviewerMode, PermissionMode } from "../approvals/permissionModes";
import { activeChannel, replaceChannel } from "../models/channels";
import type { ModelSettings, ProviderSettings, ServiceTier } from "../models/types";

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

/**
 * Core 的 Thread 设置是权威值。写回当前激活渠道自己的那一份参数，
 * 其他渠道保存的参数保持不变。
 */
export function providerSettingsFromThread(
  current: ProviderSettings,
  authoritative: ThreadSettings,
): ProviderSettings {
  const channel = activeChannel(current);
  if (!channel) return current;
  const conversation = modelSettingsFromThread(channel.conversation, authoritative);
  return replaceChannel(current, { ...channel, conversation });
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
