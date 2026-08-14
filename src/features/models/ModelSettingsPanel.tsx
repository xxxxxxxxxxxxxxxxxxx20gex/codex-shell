import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ModelProviderCapabilitiesReadResponse } from "../../generated/app-server/v2/ModelProviderCapabilitiesReadResponse";
import { errorMessage } from "../../shared/errors";
import type { ModelSettings, Verbosity } from "./types";

interface Props {
  settings: ModelSettings;
  loadProviderCapabilities: () => Promise<ModelProviderCapabilitiesReadResponse>;
  onClose: () => void;
  onSave: (settings: ModelSettings, requiresRestart?: boolean) => void;
}

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

export function ModelSettingsPanel({
  settings,
  loadProviderCapabilities,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(settings);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const [providerCapabilities, setProviderCapabilities] = useState<ModelProviderCapabilitiesReadResponse | null>(null);

  useEffect(() => {
    let active = true;
    void loadProviderCapabilities().then((capabilities) => {
      if (!active) return;
      setProviderCapabilities(capabilities);
    }).catch((loadError) => {
      if (active) setStatus(`原生模型目录读取失败，仍可手动配置：${errorMessage(loadError)}`);
    });
    return () => {
      active = false;
    };
  }, [loadProviderCapabilities]);

  async function save() {
    const normalizedDraft = {
      ...draft,
      baseUrl: draft.baseUrl.trim(),
      modelId: draft.modelId.trim(),
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
        <header><div><span className="eyebrow">高级设置</span><h2>网关与自定义模型</h2><p>密钥只写入 Windows 凭据管理器，项目配置不会保存明文。</p></div><button className="close-button" onClick={onClose}>×</button></header>
        <div className="settings-body">
          <label className="field"><span>Base URL</span><input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" /></label>
          <label className="field"><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="保留为空则继续使用已保存的密钥" autoComplete="off" /><small>保存后立即清空输入框；前端没有读取密钥的接口。</small></label>
          <label className="field"><span>自定义模型 ID</span><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} placeholder="输入网关提供的模型 ID" /><small>模型与推理强度可在对话框中随时切换；这里用于自定义模型或后续扩展参数。</small></label>
          {providerCapabilities && <div className="template-detail"><div><strong>Provider 能力</strong></div><small>{providerCapabilities.webSearch ? "Web Search" : "无 Web Search"} · {providerCapabilities.imageGeneration ? "Image Generation" : "无图片生成"} · {providerCapabilities.namespaceTools ? "Namespace Tools" : "无 Namespace Tools"}</small></div>}
          <div className="field"><span>回答冗余度</span><div className="segmented three">{(["low", "medium", "high"] as Verbosity[]).map((verbosity) => <button key={verbosity} className={draft.verbosity === verbosity ? "active" : ""} onClick={() => setDraft({ ...draft, verbosity })}>{verbosity === "low" ? "简洁" : verbosity === "medium" ? "适中" : "详细"}</button>)}</div></div>
          {status && <div className="form-status">{status}</div>}
        </div>
        <footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={save}>保存配置</button></footer>
      </section>
    </div>
  );
}
