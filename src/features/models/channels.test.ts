import { describe, expect, it } from "vitest";
import type { Model } from "../../generated/app-server/v2/Model";
import {
  activeChannel,
  activeConversation,
  createChannel,
  defaultConversation,
  generateChannelId,
  reconcileConversation,
  replaceChannel,
  vendorDescriptor,
} from "./channels";
import type { Channel, ProviderSettings } from "./types";

function model(overrides: Partial<Model> = {}): Model {
  return {
    id: "catalog-model",
    model: "catalog-model",
    upgrade: null,
    upgradeInfo: null,
    availabilityNux: null,
    displayName: "Catalog model",
    description: "",
    modelSpecialty: null,
    hidden: false,
    supportedReasoningEfforts: [],
    defaultReasoningEffort: "none",
    inputModalities: ["text"],
    supportsPersonality: false,
    multiAgentVersion: null,
    additionalSpeedTiers: [],
    serviceTiers: [],
    defaultServiceTier: null,
    isDefault: false,
    ...overrides,
  };
}

const openAi: Channel = {
  id: "openai-1",
  vendor: "openai",
  name: "OpenAI 官方",
  baseUrl: "https://api.openai.com/v1",
  catalog: { kind: "vendorDefault" },
  conversation: { modelId: "gpt-test", reasoningEffort: "high", reasoningSummary: "auto", verbosity: "medium", serviceTier: "priority" },
};

const deepSeek: Channel = {
  id: "deepseek-2",
  vendor: "deepseek",
  name: "DeepSeek 官方",
  baseUrl: "https://api.deepseek.com",
  catalog: { kind: "vendorDefault" },
  conversation: { modelId: "deepseek-flash", reasoningEffort: "high", reasoningSummary: null, verbosity: null, serviceTier: "default" },
};

function settings(activeChannelId: string | null, channels: Channel[]): ProviderSettings {
  return { schemaVersion: 2, activeChannelId, channels };
}

describe("channel bookkeeping", () => {
  it("creates a vendor-shaped channel with an empty conversation", () => {
    const channel = createChannel("deepseek", []);

    expect(channel.vendor).toBe("deepseek");
    expect(channel.name).toBe(vendorDescriptor("deepseek").label);
    expect(channel.baseUrl).toBe("https://api.deepseek.com");
    expect(channel.catalog).toEqual({ kind: "vendorDefault" });
    expect(channel.conversation).toEqual(defaultConversation());
  });

  it("generates channel ids that the credential store accepts", () => {
    const generated = generateChannelId("openai", []);
    expect(generated.startsWith("openai-")).toBe(true);
    expect(generated).toMatch(/^[a-z0-9][a-z0-9-]{0,63}$/);

    const existing: Channel[] = [{ ...openAi, id: generated }];
    expect(generateChannelId("openai", existing)).not.toBe(generated);
    expect(generateChannelId("deepseek", existing).startsWith("deepseek-")).toBe(true);
  });

  it("falls back to the first channel when the active id is missing", () => {
    expect(activeChannel(settings(null, [openAi, deepSeek]))?.id).toBe("openai-1");
    expect(activeChannel(settings("gone", [openAi, deepSeek]))?.id).toBe("openai-1");
    expect(activeChannel(settings("deepseek-2", [openAi, deepSeek]))?.id).toBe("deepseek-2");
    expect(activeChannel(settings(null, []))).toBeNull();
    expect(activeConversation(settings(null, []))).toEqual(defaultConversation());
  });

  it("replaces only the matching channel and keeps the others untouched", () => {
    const current = settings("openai-1", [openAi, deepSeek]);
    const next = replaceChannel(current, { ...openAi, name: "重命名" });

    expect(next.channels[0].name).toBe("重命名");
    expect(next.channels[1]).toBe(current.channels[1]);
    expect(next.activeChannelId).toBe("openai-1");
  });
});

describe("reconcileConversation", () => {
  const catalog = [
    model({ id: "deepseek-flash", model: "deepseek-flash", isDefault: true, supportedReasoningEfforts: [{ reasoningEffort: "low", description: "" }, { reasoningEffort: "high", description: "" }] }),
    model({ id: "deepseek-v4-pro", model: "deepseek-v4-pro" }),
  ];

  it("preserves custom models not offered by the catalog", () => {
    const reconciled = reconcileConversation({ ...deepSeek.conversation, modelId: "gpt-6-astra" }, catalog);
    expect(reconciled).toBeNull();
    expect(reconcileConversation({ ...deepSeek.conversation, modelId: "" }, catalog)?.modelId).toBe("deepseek-flash");
  });

  it("drops reasoning efforts and service tiers the new catalog does not declare", () => {
    const reconciled = reconcileConversation(
      { ...deepSeek.conversation, modelId: "deepseek-v4-pro", reasoningEffort: "high", serviceTier: "priority" },
      catalog,
    );

    expect(reconciled).toMatchObject({ modelId: "deepseek-v4-pro", reasoningEffort: null, serviceTier: "default" });
  });

  it("keeps supported parameters and reports no change when nothing has to move", () => {
    expect(reconcileConversation(deepSeek.conversation, catalog)).toBeNull();
    expect(reconcileConversation(
      { ...deepSeek.conversation, modelId: "deepseek-flash", reasoningEffort: "high" },
      catalog,
    )).toBeNull();
  });

  it("does nothing while the catalog is still unknown", () => {
    expect(reconcileConversation(deepSeek.conversation, [])).toBeNull();
  });

  it("calibrating one channel cannot change another channel's parameters", () => {
    const current = settings("deepseek-2", [openAi, deepSeek]);
    const reconciled = reconcileConversation({ ...deepSeek.conversation, modelId: "" }, [model({ id: "deepseek-v4-pro", model: "deepseek-v4-pro", isDefault: true })]);
    const next = replaceChannel(current, { ...deepSeek, conversation: reconciled ?? deepSeek.conversation });

    expect(next.channels[0]).toBe(current.channels[0]);
    expect(next.channels[0].conversation).toEqual(openAi.conversation);
    expect(next.channels[1].conversation.modelId).toBe("deepseek-v4-pro");
  });
});
