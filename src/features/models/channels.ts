import type { Model } from "../../generated/app-server/v2/Model";
import type { Channel, ModelSettings, ProviderSettings, VendorId } from "./types";

export interface VendorDescriptor {
  id: VendorId;
  label: string;
  defaultBaseUrl: string;
  summary: string;
}

/** 内置厂商表。厂商只描述协议差异，不描述用户选择。 */
export const VENDORS: VendorDescriptor[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    summary: "官方地址或 OpenAI 兼容路由，模型目录来自 Codex Core。",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    summary: "官方 Responses API，使用随应用内置的 DeepSeek 模型目录。",
  },
];

export function vendorDescriptor(vendor: VendorId): VendorDescriptor {
  return VENDORS.find((descriptor) => descriptor.id === vendor) ?? VENDORS[0];
}

export function defaultConversation(): ModelSettings {
  return {
    modelId: "",
    reasoningEffort: null,
    reasoningSummary: null,
    verbosity: null,
    serviceTier: "default",
  };
}

const CHANNEL_ID_ALPHABET = "0123456789abcdef";

export function generateChannelId(vendor: VendorId, existing: Channel[]): string {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    let suffix = "";
    for (let index = 0; index < 8; index += 1) {
      suffix += CHANNEL_ID_ALPHABET[Math.floor(Math.random() * CHANNEL_ID_ALPHABET.length)];
    }
    const candidate = `${vendor}-${suffix}`;
    if (!existing.some((channel) => channel.id === candidate)) return candidate;
  }
  return `${vendor}-${Date.now().toString(16).slice(-8)}`;
}

export function createChannel(vendor: VendorId, existing: Channel[]): Channel {
  const descriptor = vendorDescriptor(vendor);
  return {
    id: generateChannelId(vendor, existing),
    vendor,
    name: descriptor.label,
    baseUrl: descriptor.defaultBaseUrl,
    catalog: { kind: "vendorDefault" },
    conversation: defaultConversation(),
  };
}

export function activeChannel(settings: ProviderSettings): Channel | null {
  if (settings.activeChannelId) {
    const match = settings.channels.find((channel) => channel.id === settings.activeChannelId);
    if (match) return match;
  }
  return settings.channels[0] ?? null;
}

export function activeConversation(settings: ProviderSettings): ModelSettings {
  return activeChannel(settings)?.conversation ?? defaultConversation();
}

export function replaceChannel(settings: ProviderSettings, channel: Channel): ProviderSettings {
  return {
    ...settings,
    channels: settings.channels.map((current) => (current.id === channel.id ? channel : current)),
  };
}

function conversationEquals(left: ModelSettings, right: ModelSettings): boolean {
  return (
    left.modelId === right.modelId
    && left.reasoningEffort === right.reasoningEffort
    && left.reasoningSummary === right.reasoningSummary
    && left.verbosity === right.verbosity
    && left.serviceTier === right.serviceTier
  );
}

/**
 * 把渠道参数收敛到当前模型目录允许的范围。
 *
 * 切换渠道会换掉整个模型目录，因此模型 ID 和推理档位可能不再存在。收敛规则：
 * 目录里找不到的模型回退到目录默认模型，目录不支持的推理档位回退为「不覆盖」，
 * 服务层级回退为 `default`。返回 `null` 表示无需写回，避免无意义的状态更新。
 */
export function reconcileConversation(
  conversation: ModelSettings,
  models: Model[],
): ModelSettings | null {
  if (models.length === 0) return null;
  const selected = models.find(
    (model) => model.model === conversation.modelId || model.id === conversation.modelId,
  ) ?? models.find((model) => model.isDefault) ?? models[0];
  const supportedEfforts = selected.supportedReasoningEfforts ?? [];
  const reasoningEffort = conversation.reasoningEffort === null
    || supportedEfforts.some((option) => option.reasoningEffort === conversation.reasoningEffort)
    ? conversation.reasoningEffort
    : null;
  const tiers = selected.serviceTiers ?? [];
  const serviceTier = conversation.serviceTier === "default"
    || tiers.some((tier) => tier.id === conversation.serviceTier)
    ? conversation.serviceTier
    : "default";
  const next: ModelSettings = {
    ...conversation,
    modelId: selected.model,
    reasoningEffort,
    serviceTier,
  };
  return conversationEquals(next, conversation) ? null : next;
}