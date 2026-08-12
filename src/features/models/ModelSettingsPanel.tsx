import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Model } from "../../generated/app-server/v2/Model";
import type { ModelProviderCapabilitiesReadResponse } from "../../generated/app-server/v2/ModelProviderCapabilitiesReadResponse";
import { errorMessage } from "../../shared/errors";
import { getModelTemplate, MODEL_TEMPLATES } from "./modelTemplates";
import type { ModelSettings, Verbosity } from "./types";

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
  const [nativeModels, setNativeModels] = useState<Model[]>([]);
  const [providerCapabilities, setProviderCapabilities] = useState<ModelProviderCapabilitiesReadResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const template = useMemo(() => getModelTemplate(draft.capabilityTemplate), [draft.capabilityTemplate]);
  const nativeModel = useMemo(() => nativeModels.find((model) => (
    model.model === draft.modelId || model.id === draft.modelId
  )), [draft.modelId, nativeModels]);
  const nativeEfforts = nativeModel?.supportedReasoningEfforts
    .map((option) => option.reasoningEffort)
    ?? [];
  const reasoningEfforts = nativeEfforts.length > 0
    ? nativeEfforts
    : template?.reasoningEfforts ?? [];

  useEffect(() => {
    let active = true;
    void Promise.all([loadModels(), loadProviderCapabilities()]).then(([models, capabilities]) => {
      if (!active) return;
      setNativeModels(models.filter((model) => !model.hidden));
      setProviderCapabilities(capabilities);
    }).catch((loadError) => {
      if (active) setStatus(`原生模型目录读取失败，仍可手动配置：${errorMessage(loadError)}`);
    }).finally(() => {
      if (active) setCatalogLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadModels, loadProviderCapabilities]);

  function selectTemplate(templateId: string) {
    const next = getModelTemplate(templateId);
    if (!next) return;
    setDraft((current) => ({
      ...current,
      capabilityTemplate: templateId,
      modelId: current.modelId === settings.modelId || MODEL_TEMPLATES.some((item) => item.id === current.modelId)
        ? (templateId === "openai-compatible-basic" ? current.modelId : templateId)
        : current.modelId,
      reasoningEffort: next.defaultReasoningEffort,
      verbosity: next.defaultVerbosity,
    }));
  }

  function selectNativeModel(modelId: string) {
    const model = nativeModels.find((item) => item.id === modelId || item.model === modelId);
    if (!model) return;
    setDraft((current) => ({
      ...current,
      modelId: model.model,
      reasoningEffort: model.defaultReasoningEffort,
      capabilityTemplate: MODEL_TEMPLATES.some((item) => item.id === model.model)
        ? model.model
        : current.capabilityTemplate,
    }));
  }

  async function save() {
    if (!draft.baseUrl.trim() || !draft.modelId.trim()) {
      setStatus("Base URL 与模型 ID 不能为空");
      return;
    }
    try {
      if (isTauri()) {
        await invoke("save_model_settings", { settings: draft });
        if (apiKey) await invoke("save_api_key", { apiKey });
      }
      setApiKey("");
      const requiresRestart = Boolean(
        apiKey
        || draft.baseUrl !== settings.baseUrl
        || draft.capabilityTemplate !== settings.capabilityTemplate
        || draft.verbosity !== settings.verbosity,
      );
      if (requiresRestart) onSave(draft, true);
      else onSave(draft);
    } catch (error) {
      setStatus(errorMessage(error));
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">运行时设置</span><h2>模型与接口</h2><p>密钥只写入 Windows 凭据管理器，项目配置不会保存明文。</p></div><button className="close-button" onClick={onClose}>×</button></header>
        <div className="settings-body">
          <label className="field"><span>Base URL</span><input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" /></label>
          <label className="field"><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="保留为空则继续使用已保存的密钥" autoComplete="off" /><small>保存后立即清空输入框；前端没有读取密钥的接口。</small></label>
          <label className="field">
            <span>app-server 原生模型目录</span>
            <select value={nativeModel?.id ?? ""} disabled={catalogLoading || nativeModels.length === 0} onChange={(event) => selectNativeModel(event.target.value)}>
              <option value="">{catalogLoading ? "正在读取模型…" : nativeModels.length === 0 ? "当前 Provider 没有返回模型目录" : "保留手填模型 ID"}</option>
              {nativeModels.map((model) => <option key={model.id} value={model.id}>{model.displayName || model.model}</option>)}
            </select>
            <small>原生目录提供推理强度与输入模态；第三方中转站仍可使用下方手填方式。</small>
          </label>
          <label className="field"><span>模型 ID</span><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} placeholder="输入中转站实际提供的模型 ID" /><small>模型 ID 可以自由填写，能力由下方模板单独决定。</small></label>

          <div className="field"><span>能力模板</span><div className="template-grid">{MODEL_TEMPLATES.map((item) => <button key={item.id} className={draft.capabilityTemplate === item.id ? "active" : ""} onClick={() => selectTemplate(item.id)}><strong>{item.label}</strong><small>{item.family} · {item.inputModalities.includes("image") ? "文本/视觉" : "仅文本"}</small></button>)}</div></div>

          {nativeModel ? <div className="template-detail"><div><strong>{nativeModel.displayName}</strong><span>{nativeModel.inputModalities.join(" / ")}</span></div><p>{nativeModel.description}</p>{providerCapabilities && <small>Provider：{providerCapabilities.webSearch ? "Web Search" : "无 Web Search"} · {providerCapabilities.imageGeneration ? "Image Generation" : "无图片生成"} · {providerCapabilities.namespaceTools ? "Namespace Tools" : "无 Namespace Tools"}</small>}</div> : template && <div className="template-detail"><div><strong>{template.label}</strong><span>{template.contextWindow ? `${(template.contextWindow / 1000).toFixed(0)}K 上下文` : "上下文由服务端决定"}</span></div><p>{template.description}</p></div>}

          {reasoningEfforts.length > 0 && <div className="field"><span>推理强度</span><div className="segmented">{reasoningEfforts.map((effort) => <button key={effort} className={draft.reasoningEffort === effort ? "active" : ""} onClick={() => setDraft({ ...draft, reasoningEffort: effort })}>{effort}</button>)}</div></div>}

          {template?.supportsVerbosity && <div className="field"><span>回答冗余度</span><div className="segmented three">{(["low", "medium", "high"] as Verbosity[]).map((verbosity) => <button key={verbosity} className={draft.verbosity === verbosity ? "active" : ""} onClick={() => setDraft({ ...draft, verbosity })}>{verbosity === "low" ? "简洁" : verbosity === "medium" ? "适中" : "详细"}</button>)}</div></div>}
          {!nativeModel && template && template.reasoningEfforts.length === 0 && !template.supportsVerbosity && <div className="safe-mode-note">基础兼容模板不会向未知模型发送推理强度或回答冗余度参数。</div>}
          {status && <div className="form-status">{status}</div>}
        </div>
        <footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={save}>保存配置</button></footer>
      </section>
    </div>
  );
}
