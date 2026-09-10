// @vitest-environment happy-dom

import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Model } from "../../generated/app-server/v2/Model";
import type { Channel, ProviderSettings } from "./types";
import { ModelSettingsPanel } from "./ModelSettingsPanel";

afterEach(cleanup);

const conversation = {
  modelId: "custom-model",
  reasoningEffort: "none" as const,
  reasoningSummary: null,
  verbosity: null,
  serviceTier: "default" as const,
};

const openAiChannel: Channel = {
  id: "openai-1",
  vendor: "openai",
  name: "OpenAI 官方",
  baseUrl: "https://api.openai.com/v1",
  catalog: { kind: "vendorDefault" },
  conversation,
};

const deepSeekChannel: Channel = {
  id: "deepseek-2",
  vendor: "deepseek",
  name: "DeepSeek 官方",
  baseUrl: "https://api.deepseek.com",
  catalog: { kind: "vendorDefault" },
  conversation: { modelId: "deepseek-flash", reasoningEffort: null, reasoningSummary: null, verbosity: null, serviceTier: "default" },
};

const providerSettings: ProviderSettings = {
  schemaVersion: 2,
  activeChannelId: openAiChannel.id,
  channels: [openAiChannel, deepSeekChannel],
};

const loadModels = vi.fn(async (): Promise<Model[]> => [{
  id: "custom-model",
  model: "custom-model",
  upgrade: null,
  upgradeInfo: null,
  availabilityNux: null,
  displayName: "Custom model",
  description: "",
  modelSpecialty: null,
  hidden: false,
  supportedReasoningEfforts: [],
  defaultReasoningEffort: "none",
  inputModalities: ["text"],
  supportsPersonality: false,
  multiAgentVersion: null,
  additionalSpeedTiers: [],
  serviceTiers: [{ id: "priority", name: "Fast", description: "Faster, increased usage" }],
  defaultServiceTier: null,
  isDefault: true,
}]);

const loadProviderCapabilities = vi.fn(async () => ({
  namespaceTools: false,
  imageGeneration: false,
  webSearch: false,
}));

function renderPanel(overrides: Partial<ComponentProps<typeof ModelSettingsPanel>> = {}) {
  const onSave = vi.fn();
  render(
    <ModelSettingsPanel
      settings={conversation}
      providerSettings={providerSettings}
      loadModels={loadModels}
      loadProviderCapabilities={loadProviderCapabilities}
      onManageChannels={vi.fn()}
      onClose={vi.fn()}
      onSave={onSave}
      {...overrides}
    />,
  );
  return { onSave };
}

describe("ModelSettingsPanel", () => {
  it("preserves tiers while another channel's catalog is unknown", async () => {
    const { onSave } = renderPanel({ providerSettings: { ...providerSettings, channels: [openAiChannel, { ...deepSeekChannel, conversation: { ...deepSeekChannel.conversation, serviceTier: "priority" } }] } });
    await screen.findByText("Provider 能力");
    fireEvent.click(screen.getByRole("button", { name: /DeepSeek 官方/ }));
    expect(screen.queryByText("Provider 能力")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ conversation: expect.objectContaining({ serviceTier: "priority" }) })));
  });

  it("keeps the draft and reports restart failures", async () => {
    const onClose = vi.fn();
    renderPanel({ onClose, onSave: vi.fn(async () => { throw new Error("重启失败"); }) });
    fireEvent.change(screen.getByDisplayValue("custom-model"), { target: { value: "keep-me" } });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    expect(await screen.findByText("重启失败")).toBeTruthy();
    expect(screen.getByDisplayValue("keep-me")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("blocks verbosity restarts if a task starts while the editor is open", async () => {
    const { onSave } = renderPanel({ switchDisabled: true });
    fireEvent.click(screen.getByRole("button", { name: "适中" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    expect(await screen.findByText(/完成后再保存需要重启/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
  it("selects a channel instead of asking for a route and key again", () => {
    const onManageChannels = vi.fn();
    renderPanel({ onManageChannels });

    expect(screen.getByText("网关与自定义模型")).toBeTruthy();
    expect(screen.getByRole("button", { name: /OpenAI 官方/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /DeepSeek 官方/ }));
    expect(screen.getByRole("button", { name: /DeepSeek 官方/ }).className).toContain("active");

    fireEvent.click(screen.getByRole("button", { name: "管理渠道" }));
    expect(onManageChannels).toHaveBeenCalled();

    expect(screen.getByDisplayValue("deepseek-flash")).toBeTruthy();
    expect(screen.queryByDisplayValue("https://api.deepseek.com")).toBeNull();
    expect(screen.getByText(/由 Codex Core 管理/)).toBeTruthy();
    expect(screen.queryByText("能力模板")).toBeNull();
  });

  it("requests a restart when the selected channel is not the active one", async () => {
    const { onSave } = renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: /DeepSeek 官方/ })).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /DeepSeek 官方/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      conversation: deepSeekChannel.conversation,
      channelId: deepSeekChannel.id,
      requiresRestart: true,
    }));
  });

  it("keeps the other channel's parameters out of the saved payload", async () => {
    const { onSave } = renderPanel();
    await waitFor(() => expect(screen.getByRole("button", { name: /DeepSeek 官方/ })).toBeTruthy());

    fireEvent.change(screen.getByDisplayValue("custom-model"), { target: { value: "  next-model  " } });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      conversation: { ...conversation, modelId: "next-model" },
      channelId: openAiChannel.id,
      requiresRestart: false,
    }));
  });

  it("saves native reasoning summary and catalog-declared service tier without restarting", async () => {
    const { onSave } = renderPanel();

    await waitFor(() => expect(screen.getByRole("button", { name: "Fast" })).toBeTruthy());
    fireEvent.click(screen.getAllByRole("button", { name: "详细" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Fast" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      conversation: { ...conversation, reasoningSummary: "detailed", serviceTier: "priority" },
      channelId: openAiChannel.id,
      requiresRestart: false,
    }));
  });

  it("restarts only when an app-server startup parameter changes", async () => {
    const { onSave } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "适中" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      conversation: { ...conversation, verbosity: "medium" },
      channelId: openAiChannel.id,
      requiresRestart: true,
    }));
  });

  it("does not persist a service tier that the selected model does not declare", async () => {
    const { onSave } = renderPanel({
      settings: { ...conversation, serviceTier: "priority" },
      loadModels: vi.fn(async () => [{ ...(await loadModels())[0], serviceTiers: [] }]),
    });

    await waitFor(() => expect(screen.getByRole("button", { name: "标准" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      conversation: { ...conversation, serviceTier: "default" },
      channelId: openAiChannel.id,
      requiresRestart: false,
    }));
  });

  it("refuses to switch channels while a turn is running", () => {
    renderPanel({ switchDisabled: true });

    const other = screen.getByRole("button", { name: /DeepSeek 官方/ });
    expect(other.hasAttribute("disabled")).toBe(true);
    fireEvent.click(other);
    expect(other.className).not.toContain("active");
    expect(other.getAttribute("title")).toContain("完成或中断");
  });
});
