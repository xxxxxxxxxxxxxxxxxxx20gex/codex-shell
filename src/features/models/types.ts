import type { ReasoningSummary } from "../../generated/app-server/ReasoningSummary";

type ReasoningEffort = string;
export type Verbosity = "low" | "medium" | "high";
export type ServiceTier = "default" | "priority" | "flex";

/**
 * 一个渠道自己的对话参数。
 *
 * 每个渠道各持有一份，切换渠道只切换使用哪一份，不会覆盖其他渠道已经调好的值。
 */
export interface ModelSettings {
  modelId: string;
  reasoningEffort: ReasoningEffort | null;
  reasoningSummary: ReasoningSummary | null;
  verbosity: Verbosity | null;
  serviceTier: ServiceTier;
}

export type VendorId = "openai" | "deepseek";

/** 内置目录沿用 Codex Core 的模型列表；文件目录指向一个 `models.json`。 */
type ChannelCatalog = { kind: "vendorDefault" } | { kind: "file"; path: string };

/** 渠道 = 路由 + 模型目录 + 该渠道的对话参数。密钥不在这里，只以 `id` 索引系统凭据。 */
export interface Channel {
  id: string;
  vendor: VendorId;
  name: string;
  baseUrl: string;
  catalog: ChannelCatalog;
  conversation: ModelSettings;
}

/** 渠道列表与当前激活渠道。同一时刻只有一个渠道生效。 */
export interface ProviderSettings {
  schemaVersion: number;
  activeChannelId: string | null;
  channels: Channel[];
}

export type ThemePreference = "dark" | "light" | "system";

export interface PersonalizationSettings {
  customInstructions: string;
  theme: ThemePreference;
}