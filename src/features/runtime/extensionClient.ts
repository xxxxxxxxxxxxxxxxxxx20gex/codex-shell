import type { ConfigReadResponse } from "../../generated/app-server/v2/ConfigReadResponse";
import type { ConfigBatchWriteParams } from "../../generated/app-server/v2/ConfigBatchWriteParams";
import type { ConfigWriteResponse } from "../../generated/app-server/v2/ConfigWriteResponse";

export class ExtensionClient {
  constructor(private readonly request: <T>(method: string, params?: unknown) => Promise<T>) {}

  readConfig() {
    return this.request<ConfigReadResponse>("config/read", { includeLayers: true });
  }

  writeConfig(params: ConfigBatchWriteParams) {
    return this.request<ConfigWriteResponse>("config/batchWrite", params);
  }

}
