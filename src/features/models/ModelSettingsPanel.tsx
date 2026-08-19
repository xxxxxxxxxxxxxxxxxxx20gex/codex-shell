import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import type { ReasoningSummary } from "../../generated/app-server/ReasoningSummary";
import type { Model } from "../../generated/app-server/v2/Model";
import type { ModelProviderCapabilitiesReadResponse } from "../../generated/app-server/v2/ModelProviderCapabilitiesReadResponse";
import { errorMessage } from "../../shared/errors";
import type { ModelSettings, ServiceTier, Verbosity } from "./types";

interface Props {
  settings: ModelSettings;
  loadModels: () => Promise<Model[]>;
  loadProviderCapabilities: () => Promise<ModelProviderCapabilitiesReadResponse>;
  onClose: () => void;
  onSave: (settings: ModelSettings, requiresRestart?: boolean) => void;
}

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

export function ModelSettingsPanel({
  settings,
  loadModels,
  loadProviderCapabilities,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(settings);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [providerCapabilities, setProviderCapabilities] = useState<ModelProviderCapabilitiesReadResponse | null>(null);
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    let active = true;
    void loadProviderCapabilities().then((capabilities) => {
      if (!active) return;
      setProviderCapabilities(capabilities);
    }).catch((loadError) => {
      if (active) setStatus(`原生模型目录读取失败，仍可手动配置：${errorMessage(loadError)}`);
    });
    void loadModels().then((items) => {
      if (active) setModels(items);
    }).catch((loadError) => {
      if (active) setStatus(`模型参数目录读取失败，仅保留标准服务层级：${errorMessage(loadError)}`);
    });
    return () => {
      active = false;
    };
  }, [loadModels, loadProviderCapabilities]);

  const selectedModel = models.find((model) => model.model === draft.modelId || model.id === draft.modelId);
  const availableServiceTiers = selectedModel?.serviceTiers.filter((tier) => tier.id === "priority" || tier.id === "flex") ?? [];

  async function save() {
    const normalizedDraft = {
      ...draft,
      baseUrl: draft.baseUrl.trim(),
      modelId: draft.modelId.trim(),
      serviceTier: draft.serviceTier === "default" || availableServiceTiers.some((tier) => tier.id === draft.serviceTier)
        ? draft.serviceTier
        : "default",
    };
    if (!normalizedDraft.baseUrl || !normalizedDraft.modelId) {
      setStatus("Base URL 与模型 ID 不能为空");
      return;
    }
    try {
      if (isTauri()) {
        await invoke("save_model_settings", { settings: normalizedDraft });
        if (apiKey) await invoke("save_api_key", { apiKey });
      }
      setApiKey("");
      const requiresRestart = Boolean(
        apiKey
        || normalizedDraft.baseUrl !== settings.baseUrl
        || normalizedDraft.verbosity !== settings.verbosity,
      );
      if (requiresRestart) onSave(normalizedDraft, true);
      else onSave(normalizedDraft);
    } catch (error) {
      setStatus(errorMessage(error));
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">高级设置</span><h2>网关与自定义模型</h2><p>密钥只写入 Windows 凭据管理器，项目配置不会保存明文。</p></div><button className="close-button" onClick={onClose} aria-label="关闭高级设置" title="关闭高级设置"><X aria-hidden="true" /></button></header>
        <div className="settings-body">
          <label className="field"><span>Base URL</span><input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" /></label>
          <label className="field"><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="保留为空则继续使用已保存的密钥" autoComplete="off" /><small>保存后立即清空输入框；前端没有读取密钥的接口。</small></label>
          <label className="field"><span>自定义模型 ID</span><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} placeholder="输入网关提供的模型 ID" /><small>模型与推理强度可在对话框中随时切换；这里用于自定义模型或后续扩展参数。</small></label>
          {providerCapabilities && <div className="template-detail"><div><strong>Provider 能力</strong></div><small>{providerCapabilities.webSearch ? "Web Search" : "无 Web Search"} · {providerCapabilities.imageGeneration ? "Image Generation" : "无图片生成"} · {providerCapabilities.namespaceTools ? "Namespace Tools" : "无 Namespace Tools"}</small></div>}
          <div className="field"><span>推理摘要</span><div className="segmented five"><button className={draft.reasoningSummary === null ? "active" : ""} onClick={() => setDraft({ ...draft, reasoningSummary: null })}>默认</button>{(["auto", "concise", "detailed", "none"] as ReasoningSummary[]).map((summary) => <button key={summary} className={draft.reasoningSummary === summary ? "active" : ""} onClick={() => setDraft({ ...draft, reasoningSummary: summary })}>{summary === "auto" ? "自动" : summary === "concise" ? "简洁" : summary === "detailed" ? "详细" : "关闭"}</button>)}</div><small>对应官方 `reasoning.summary`；默认表示不覆盖 Codex Core 与模型目录。模型不支持时 Core 会省略该字段。</small></div>
          <div className="field"><span>回答冗余度</span><div className="segmented four"><button className={draft.verbosity === null ? "active" : ""} onClick={() => setDraft({ ...draft, verbosity: null })}>默认</button>{(["low", "medium", "high"] as Verbosity[]).map((verbosity) => <button key={verbosity} className={draft.verbosity === verbosity ? "active" : ""} onClick={() => setDraft({ ...draft, verbosity })}>{verbosity === "low" ? "简洁" : verbosity === "medium" ? "适中" : "详细"}</button>)}</div><small>对应官方 `text.verbosity`；默认表示不覆盖 Core 与模型目录。显式设置仅在模型支持时生效，并需要重启连接。</small></div>
          <div className="field"><span>服务层级</span><div className={`segmented ${availableServiceTiers.length >= 2 ? "three" : "two"}`}><button className={draft.serviceTier === "default" ? "active" : ""} onClick={() => setDraft({ ...draft, serviceTier: "default" })}>标准</button>{availableServiceTiers.map((tier) => <button key={tier.id} title={tier.description} className={draft.serviceTier === tier.id ? "active" : ""} onClick={() => setDraft({ ...draft, serviceTier: tier.id as ServiceTier })}>{tier.name || tier.id}</button>)}</div><small>对应官方 `service_tier`，只显示当前模型目录声明的选项；标准模式不发送该字段。Priority 通常更快但可能增加费用，Flex 适合可延迟任务。</small></div>
          <div className="template-detail"><div><strong>由 Codex Core 管理</strong></div><small>`temperature`、`top_p`、`max_output_tokens`、工具选择、并行工具调用、缓存键、流式传输和存储策略由当前固定 Codex Core 管理，壳子不会提供无法传入上游的伪设置。</small></div>
          {status && <div className="form-status">{status}</div>}
        </div>
        <footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={save}>保存配置</button></footer>
      </section>
    </div>
  );
}
