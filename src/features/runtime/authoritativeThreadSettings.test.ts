import { describe, expect, it } from "vitest";
import type { ThreadSettings } from "../../generated/app-server/v2/ThreadSettings";
import type { ModelSettings, ProviderSettings } from "../models/types";
import {
  approvalReviewerFromThread,
  modelSettingsFromThread,
  permissionModeFromThread,
  providerSettingsFromThread,
} from "./authoritativeThreadSettings";

const providerSettings: ProviderSettings = {
  schemaVersion: 2,
  activeChannelId: "openai-1",
  channels: [
    {
      id: "openai-1",
      vendor: "openai",
      name: "OpenAI 官方",
      baseUrl: "https://api.openai.com/v1",
      catalog: { kind: "vendorDefault" },
      conversation: { modelId: "gpt-a", reasoningEffort: "low", reasoningSummary: null, verbosity: null, serviceTier: "default" },
    },
    {
      id: "deepseek-2",
      vendor: "deepseek",
      name: "DeepSeek 官方",
      baseUrl: "https://api.deepseek.com",
      catalog: { kind: "vendorDefault" },
      conversation: { modelId: "deepseek-flash", reasoningEffort: "high", reasoningSummary: "detailed", verbosity: null, serviceTier: "default" },
    },
  ],
};

const current: ModelSettings = {
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
    multiAgentMode: "explicitRequestOnly", personality: null,
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

  it("writes authoritative settings back only into the active channel", () => {
    const next = providerSettingsFromThread(providerSettings, threadSettings({ model: "gpt-b", effort: "medium" }));

    expect(next.channels[0].conversation).toMatchObject({ modelId: "gpt-b", reasoningEffort: "medium" });
    expect(next.channels[1]).toEqual(providerSettings.channels[1]);
    expect(next.activeChannelId).toBe("openai-1");
  });

  it("keeps other channels untouched when the active channel is not the first one", () => {
    const switched: ProviderSettings = { ...providerSettings, activeChannelId: "deepseek-2" };
    const next = providerSettingsFromThread(switched, threadSettings({ model: "deepseek-v4-pro" }));

    expect(next.channels[1].conversation.modelId).toBe("deepseek-v4-pro");
    expect(next.channels[0]).toEqual(providerSettings.channels[0]);
  });
});
