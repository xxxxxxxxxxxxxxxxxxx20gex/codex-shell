import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import type { ReasoningSummary } from "../../generated/app-server/ReasoningSummary";
import type { Model } from "../../generated/app-server/v2/Model";
import { errorMessage } from "../../shared/errors";
import { vendorDescriptor } from "./channels";
import type { ModelSettings, ProviderSettings, ServiceTier, Verbosity } from "./types";

interface Props {
  settings: ModelSettings;
  providerSettings: ProviderSettings;
  loadModels: () => Promise<Model[]>;
  onManageChannels: () => void;
  /** 有回合正在执行时禁止切换渠道：切换必然重启执行核心。 */
  switchDisabled?: boolean;
  onClose: () => void;
  onSave: (next: { conversation: ModelSettings; channelId: string; requiresRestart: boolean }) => void | Promise<void>;
}

export function ModelSettingsPanel({
  settings,
  providerSettings,
  loadModels,
  onManageChannels,
  switchDisabled = false,
  onClose,
  onSave,
}: Props) {
  const activeChannelId = providerSettings.activeChannelId ?? providerSettings.channels[0]?.id ?? "";
  const [channelId, setChannelId] = useState(activeChannelId);
  const [draft, setDraft] = useState(settings);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    let active = true;
    void loadModels().then((items) => {
      if (active) setModels(items);
    }).catch((loadError) => {
      if (active) setStatus(`模型参数目录读取失败，仅保留标准服务层级：${errorMessage(loadError)}`);
    });
    return () => {
      active = false;
    };
  }, [loadModels]);

  // 模型目录属于当前运行的渠道；选择其他渠道时不能拿它的目录冒充。
  const catalogApplies = channelId === activeChannelId;
  const selectedModel = catalogApplies
    ? models.find((model) => model.model === draft.modelId || model.id === draft.modelId)
    : undefined;
  const availableServiceTiers = useMemo(
    () => selectedModel?.serviceTiers.filter((tier) => tier.id === "priority" || tier.id === "flex") ?? [],
    [selectedModel],
  );

  async function save() {
    const normalizedDraft: ModelSettings = {
      ...draft,
      modelId: draft.modelId.trim(),
      serviceTier: !selectedModel || draft.serviceTier === "default" || availableServiceTiers.some((tier) => tier.id === draft.serviceTier)
        ? draft.serviceTier
        : "default",
    };
    const requiresRestart = channelId !== activeChannelId || normalizedDraft.verbosity !== settings.verbosity;
    if (requiresRestart && switchDisabled) { setStatus("有任务正在执行，完成后再保存需要重启的配置"); return; }
    setSaving(true);
    try {
      await onSave({
      conversation: normalizedDraft,
      channelId,
      requiresRestart,
    });
    } catch (error) { setStatus(errorMessage(error)); }
    finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={() => { if (!saving) onClose(); }}>
      <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">高级设置</span><h2>网关与自定义模型</h2><p>渠道与密钥在设置中统一管理，这里只选择渠道并调整参数。</p></div><button className="close-button" onClick={onClose} aria-label="关闭高级设置" title="关闭高级设置"><X aria-hidden="true" /></button></header>
        <div className="settings-body" inert={saving}>
          <div className="field">
            <div className="channel-picker-header"><span>渠道</span><button className="channel-picker-manage" onClick={onManageChannels} title="前往设置管理渠道">管理渠道<ArrowRight aria-hidden="true" /></button></div>
            <div className="channel-picker" role="group" aria-label="渠道选择">
              {providerSettings.channels.length === 0 && <small>尚未配置渠道，请先在设置中新增。</small>}
              {providerSettings.channels.map((item) => (
                <button
                  key={item.id}
                  className={item.id === channelId ? "active" : ""}
                  aria-pressed={item.id === channelId}
                  disabled={switchDisabled && item.id !== channelId}
                  title={switchDisabled && item.id !== channelId ? "有回合正在执行，完成或中断后再切换渠道" : item.name}
                  onClick={() => { setChannelId(item.id); setDraft(item.conversation); }}
                >
                  <Check aria-hidden="true" />
                  <strong>{item.name}</strong>
                  <small>{vendorDescriptor(item.vendor).label}</small>
                </button>
              ))}
            </div>
            <small>{channelId !== activeChannelId ? (switchDisabled ? "有回合正在执行，完成或中断后才能切换渠道。" : "切换渠道会在保存后按新渠道的模型目录校准参数。") : "当前生效的渠道。"}</small>
          </div>
          <label className="field"><span>自定义模型 ID</span><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} placeholder="留空则使用该渠道目录的默认模型" /></label>
          <div className="field"><span>推理摘要</span><div className="segmented five"><button className={draft.reasoningSummary === null ? "active" : ""} onClick={() => setDraft({ ...draft, reasoningSummary: null })}>默认</button>{(["auto", "concise", "detailed", "none"] as ReasoningSummary[]).map((summary) => <button key={summary} className={draft.reasoningSummary === summary ? "active" : ""} onClick={() => setDraft({ ...draft, reasoningSummary: summary })}>{summary === "auto" ? "自动" : summary === "concise" ? "简洁" : summary === "detailed" ? "详细" : "关闭"}</button>)}</div></div>
          <div className="field"><span>回答冗余度</span><div className="segmented four"><button className={draft.verbosity === null ? "active" : ""} onClick={() => setDraft({ ...draft, verbosity: null })}>默认</button>{(["low", "medium", "high"] as Verbosity[]).map((verbosity) => <button key={verbosity} className={draft.verbosity === verbosity ? "active" : ""} onClick={() => setDraft({ ...draft, verbosity })}>{verbosity === "low" ? "简洁" : verbosity === "medium" ? "适中" : "详细"}</button>)}</div></div>
          <div className="field"><span>服务层级</span><div className={`segmented ${availableServiceTiers.length >= 2 ? "three" : "two"}`}><button className={draft.serviceTier === "default" ? "active" : ""} onClick={() => setDraft({ ...draft, serviceTier: "default" })}>标准</button>{availableServiceTiers.map((tier) => <button key={tier.id} title={tier.description} className={draft.serviceTier === tier.id ? "active" : ""} onClick={() => setDraft({ ...draft, serviceTier: tier.id as ServiceTier })}>{tier.name || tier.id}</button>)}</div></div>
          {status && <div className="form-status">{status}</div>}
        </div>
        <footer><button className="secondary-button" disabled={saving} onClick={onClose}>取消</button><button className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? "保存中…" : "保存配置"}</button></footer>
      </section>
    </div>
  );
}
