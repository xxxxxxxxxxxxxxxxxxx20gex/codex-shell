import type { ConfigReadResponse } from "../../generated/app-server/v2/ConfigReadResponse";
import type { ConfigBatchWriteParams } from "../../generated/app-server/v2/ConfigBatchWriteParams";
import type { ConfigWriteResponse } from "../../generated/app-server/v2/ConfigWriteResponse";
import type { PluginListResponse } from "../../generated/app-server/v2/PluginListResponse";
import type { PluginReadParams } from "../../generated/app-server/v2/PluginReadParams";
import type { PluginReadResponse } from "../../generated/app-server/v2/PluginReadResponse";
import type { PluginInstallParams } from "../../generated/app-server/v2/PluginInstallParams";
import type { PluginInstallResponse } from "../../generated/app-server/v2/PluginInstallResponse";
import type { PluginUninstallResponse } from "../../generated/app-server/v2/PluginUninstallResponse";
import type { MarketplaceAddResponse } from "../../generated/app-server/v2/MarketplaceAddResponse";
import type { MarketplaceRemoveResponse } from "../../generated/app-server/v2/MarketplaceRemoveResponse";
import type { MarketplaceUpgradeResponse } from "../../generated/app-server/v2/MarketplaceUpgradeResponse";

export class ExtensionClient {
  constructor(private readonly request: <T>(method: string, params?: unknown) => Promise<T>) {}

  readConfig() {
    return this.request<ConfigReadResponse>("config/read", { includeLayers: true });
  }

  writeConfig(params: ConfigBatchWriteParams) {
    return this.request<ConfigWriteResponse>("config/batchWrite", params);
  }

  listPlugins() {
    return this.request<PluginListResponse>("plugin/list", { marketplaceKinds: ["local"] });
  }

  readPlugin(params: PluginReadParams) {
    return this.request<PluginReadResponse>("plugin/read", params);
  }

  installPlugin(params: PluginInstallParams) {
    return this.request<PluginInstallResponse>("plugin/install", params);
  }

  uninstallPlugin(pluginId: string) {
    return this.request<PluginUninstallResponse>("plugin/uninstall", { pluginId });
  }

  addMarketplace(source: string) {
    return this.request<MarketplaceAddResponse>("marketplace/add", { source });
  }

  removeMarketplace(marketplaceName: string) {
    return this.request<MarketplaceRemoveResponse>("marketplace/remove", { marketplaceName });
  }

  upgradeMarketplace(marketplaceName: string) {
    return this.request<MarketplaceUpgradeResponse>("marketplace/upgrade", { marketplaceName });
  }
}
