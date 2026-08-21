import { describe, expect, it } from "vitest";
import type { ThreadSettings } from "../../generated/app-server/v2/ThreadSettings";
import type { ModelSettings } from "../models/types";
import {
  approvalReviewerFromThread,
  modelSettingsFromThread,
  permissionModeFromThread,
} from "./authoritativeThreadSettings";

const current: ModelSettings = {
  baseUrl: "https://gateway.example/v1",
  modelId: "pending-model",
  reasoningEffort: "low",
  reasoningSummary: "concise",
  verbosity: "high",
  serviceTier: "flex",
};

function threadSettings(overrides: Partial<ThreadSettings> = {}): ThreadSettings {
  return {
    cwd: "C:\\work",
    approvalPolicy: "on-request",
    approvalsReviewer: "auto_review",
    sandboxPolicy: {
      type: "workspaceWrite",
      writableRoots: [],
      networkAccess: false,
      excludeTmpdirEnvVar: false,
      excludeSlashTmp: false,
    },
    activePermissionProfile: null,
    model: "authoritative-model",
    modelProvider: "openai",
    serviceTier: "priority",
    effort: "high",
    summary: "detailed",
    collaborationMode: {
      mode: "default",
      settings: { model: "authoritative-model", reasoning_effort: "high", developer_instructions: null },
    },
    personality: null,
    ...overrides,
  };
}

describe("authoritative Thread settings", () => {
  it("applies Core-owned model parameters without replacing provider-only settings", () => {
    expect(modelSettingsFromThread(current, threadSettings())).toEqual({
      ...current,
      modelId: "authoritative-model",
      reasoningEffort: "high",
      reasoningSummary: "detailed",
      serviceTier: "priority",
    });
  });

  it("maps sandbox and reviewer settings to the Composer controls conservatively", () => {
    expect(permissionModeFromThread(threadSettings())).toBe("workspace");
    expect(permissionModeFromThread(threadSettings({ sandboxPolicy: { type: "dangerFullAccess" } }))).toBe("full");
    expect(permissionModeFromThread(threadSettings({ sandboxPolicy: { type: "externalSandbox", networkAccess: "restricted" } }))).toBe("read");
    expect(approvalReviewerFromThread(threadSettings())).toBe("auto_review");
    expect(approvalReviewerFromThread(threadSettings({ approvalsReviewer: "guardian_subagent" }))).toBe("user");
  });

  it("falls back to the standard service tier when Core reports no supported override", () => {
    expect(modelSettingsFromThread(current, threadSettings({ serviceTier: null })).serviceTier).toBe("default");
    expect(modelSettingsFromThread(current, threadSettings({ serviceTier: "future-tier" })).serviceTier).toBe("default");
  });
});
