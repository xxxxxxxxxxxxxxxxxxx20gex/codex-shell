import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { ReasoningSummary } from "../../generated/app-server/ReasoningSummary";
import type { Model } from "../../generated/app-server/v2/Model";
import type { ModelProviderCapabilitiesReadResponse } from "../../generated/app-server/v2/ModelProviderCapabilitiesReadResponse";
import { errorMessage } from "../../shared/errors";
import { vendorDescriptor } from "./channels";
import type { ModelSettings, ProviderSettings, ServiceTier, Verbosity } from "./types";

interface Props {
  settings: ModelSettings;
  providerSettings: ProviderSettings;
  loadModels: () => Promise<Model[]>;
  loadProviderCapabilities: () => Promise<ModelProviderCapabilitiesReadResponse>;
  onManageChannels: () => void;
  /** 有回合正在执行时禁止切换渠道：切换必然重启执行核心。 */
  switchDisabled?: boolean;
  onClose: () => void;
  onSave: (next: { conversation: ModelSettings; channelId: string; requiresRestart: boolean }) => void;
}

export function ModelSettingsPanel({
  settings,
  providerSettings,
  loadModels,
  loadProviderCapabilities,
  onManageChannels,
  switchDisabled = false,
  onClose,
  onSave,
}: Props) {
  const activeChannelId = providerSettings.activeChannelId ?? providerSettings.channels[0]?.id ?? "";
  const [channelId, setChannelId] = useState(activeChannelId);
  const [draft, setDraft] = useState(settings);
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

  // 模型目录属于当前运行的渠道；选择其他渠道时不能拿它的目录冒充。
  const catalogApplies = channelId === activeChannelId;
  const selectedModel = catalogApplies
    ? models.find((model) => model.model === draft.modelId || model.id === draft.modelId)
    : undefined;
  const availableServiceTiers = useMemo(
    () => selectedModel?.serviceTiers.filter((tier) => tier.id === "priority" || tier.id === "flex") ?? [],
    [selectedModel],
  );

  function save() {
    const normalizedDraft: ModelSettings = {
      ...draft,
      modelId: draft.modelId.trim(),
      serviceTier: draft.serviceTier === "default" || availableServiceTiers.some((tier) => tier.id === draft.serviceTier)
        ? draft.serviceTier
        : "default",
    };
    onSave({
      conversation: normalizedDraft,
      channelId,
      requiresRestart: channelId !== activeChannelId || normalizedDraft.verbosity !== settings.verbosity,
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">高级设置</span><h2>网关与自定义模型</h2><p>渠道与密钥在设置中统一管理，这里只选择渠道并调整参数。</p></div><button className="close-button" onClick={onClose} aria-label="关闭高级设置" title="关闭高级设置"><X aria-hidden="true" /></button></header>
        <div className="settings-body">
          <div className="field">
            <span>渠道</span>
            <div className="channel-picker">
              {providerSettings.channels.length === 0 && <small>尚未配置渠道，请先在设置中新增。</small>}
              {providerSettings.channels.map((item) => (
                <button
                  key={item.id}
                  className={item.id === channelId ? "active" : ""}
                  disabled={switchDisabled && item.id !== channelId}
                  title={switchDisabled && item.id !== channelId ? "有回合正在执行，完成或中断后再切换渠道" : item.name}
                  onClick={() => { setChannelId(item.id); setDraft(item.conversation); }}
                >
                  <strong>{item.name}</strong>
                  <small>{vendorDescriptor(item.vendor).label}</small>
                </button>
              ))}
              <button className="channel-picker-manage" onClick={onManageChannels}>管理渠道</button>
            </div>
            <small>{channelId !== activeChannelId ? (switchDisabled ? "有回合正在执行，完成或中断后才能切换渠道。" : "切换渠道会在保存后按新渠道的模型目录校准参数。") : "当前生效的渠道。"}</small>
          </div>
          <label className="field"><span>自定义模型 ID</span><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} placeholder="留空则使用该渠道目录的默认模型" /><small>模型与推理强度可在对话框中随时切换；这里用于目录之外的模型。</small></label>
          {!catalogApplies && <div className="template-detail"><div><strong>切换到该渠道后校准</strong></div><small>模型目录属于当前生效的渠道。保存后 Codex Shell 会按新渠道的目录重新校准模型与推理档位。</small></div>}
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
