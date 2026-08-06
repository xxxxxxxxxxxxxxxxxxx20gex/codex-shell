import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getModelTemplate, MODEL_TEMPLATES } from "./modelTemplates";
import type { ModelSettings, ReasoningEffort, Verbosity } from "./types";

interface Props {
  settings: ModelSettings;
  onClose: () => void;
  onSave: (settings: ModelSettings) => void;
}

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

export function ModelSettingsPanel({ settings, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(settings);
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState("");
  const template = useMemo(() => getModelTemplate(draft.capabilityTemplate), [draft.capabilityTemplate]);

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
      onSave(draft);
    } catch (error) {
      setStatus(String(error));
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">运行时设置</span><h2>模型与接口</h2><p>密钥只写入 Windows 凭据管理器，项目配置不会保存明文。</p></div><button className="close-button" onClick={onClose}>×</button></header>
        <div className="settings-body">
          <label className="field"><span>Base URL</span><input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1" /></label>
          <label className="field"><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="保留为空则继续使用已保存的密钥" autoComplete="off" /><small>保存后立即清空输入框；前端没有读取密钥的接口。</small></label>
          <label className="field"><span>模型 ID</span><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} placeholder="输入中转站实际提供的模型 ID" /><small>模型 ID 可以自由填写，能力由下方模板单独决定。</small></label>

          <div className="field"><span>能力模板</span><div className="template-grid">{MODEL_TEMPLATES.map((item) => <button key={item.id} className={draft.capabilityTemplate === item.id ? "active" : ""} onClick={() => selectTemplate(item.id)}><strong>{item.label}</strong><small>{item.family} · {item.inputModalities.includes("image") ? "文本/视觉" : "仅文本"}</small></button>)}</div></div>

          {template && <div className="template-detail"><div><strong>{template.label}</strong><span>{template.contextWindow ? `${(template.contextWindow / 1000).toFixed(0)}K 上下文` : "上下文由服务端决定"}</span></div><p>{template.description}</p></div>}

          {template && template.reasoningEfforts.length > 0 && <div className="field"><span>推理强度</span><div className="segmented">{template.reasoningEfforts.map((effort) => <button key={effort} className={draft.reasoningEffort === effort ? "active" : ""} onClick={() => setDraft({ ...draft, reasoningEffort: effort as ReasoningEffort })}>{effort}</button>)}</div></div>}

          {template?.supportsVerbosity && <div className="field"><span>回答冗余度</span><div className="segmented three">{(["low", "medium", "high"] as Verbosity[]).map((verbosity) => <button key={verbosity} className={draft.verbosity === verbosity ? "active" : ""} onClick={() => setDraft({ ...draft, verbosity })}>{verbosity === "low" ? "简洁" : verbosity === "medium" ? "适中" : "详细"}</button>)}</div></div>}
          {template && template.reasoningEfforts.length === 0 && !template.supportsVerbosity && <div className="safe-mode-note">基础兼容模板不会向未知模型发送推理强度或回答冗余度参数。</div>}
          {status && <div className="form-status">{status}</div>}
        </div>
        <footer><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" onClick={save}>保存配置</button></footer>
      </section>
    </div>
  );
}
