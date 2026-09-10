import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { errorMessage } from "../../shared/errors";
import { VENDORS, activeChannel, createChannel, defaultConversation, vendorDescriptor } from "./channels";
import type { Channel, ProviderSettings, VendorId } from "./types";

interface Props {
  settings: ProviderSettings;
  onSave: (settings: ProviderSettings, requiresRestart?: boolean) => Promise<void>;
  /** 有回合正在执行时禁止切换渠道：切换必然重启执行核心。 */
  switchDisabled?: boolean;
}

/** `test_channel_connection` 的返回；只描述路由与密钥是否可用。 */
interface ChannelProbeReport {
  endpoint: string;
  status: number;
  modelCount: number | null;
  message: string;
}

interface ChannelProbe {
  ok: boolean;
  message: string;
}

interface ChannelDraft {
  id: string;
  vendor: VendorId;
  name: string;
  baseUrl: string;
  modelId: string;
  isNew: boolean;
}

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function channelFromDraft(draft: ChannelDraft, existing: Channel | null): Channel {
  const conversation = existing?.conversation ?? defaultConversation();
  return {
    id: draft.id,
    vendor: draft.vendor,
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    catalog: existing?.catalog ?? { kind: "vendorDefault" },
    conversation: { ...conversation, modelId: draft.modelId.trim() },
  };
}

export function ProviderChannelsPanel({ settings, onSave, switchDisabled = false }: Props) {
  const [draft, setDraft] = useState<ChannelDraft | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [keyedChannels, setKeyedChannels] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<ChannelProbe | null>(null);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    void invoke<string[]>("channel_secret_presence")
      .then((ids) => { if (active) setKeyedChannels(ids); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const current = activeChannel(settings);

  function openDraft(next: ChannelDraft) {
    setApiKey("");
    setProbe(null);
    setStatus("");
    setDraft(next);
  }

  async function testConnection() {
    if (!draft) return;
    const baseUrl = draft.baseUrl.trim();
    if (!baseUrl) {
      setProbe({ ok: false, message: "请先填写 Base URL" });
      return;
    }
    if (!isTauri()) {
      setProbe({ ok: false, message: "连接测试只能在桌面应用中运行" });
      return;
    }
    setProbing(true);
    setProbe(null);
    try {
      const report = await invoke<ChannelProbeReport>("test_channel_connection", {
        baseUrl,
        channelId: draft.isNew ? null : draft.id,
        secret: apiKey.trim() ? apiKey : null,
      });
      setProbe({ ok: report.status >= 200 && report.status < 300, message: report.message });
    } catch (error) {
      setProbe({ ok: false, message: errorMessage(error) });
    } finally {
      setProbing(false);
    }
  }

  async function commit(next: ProviderSettings, requiresRestart: boolean) {
    setBusy(true);
    setStatus("");
    try {
      await onSave(next, requiresRestart);
      setDraft(null);
      setApiKey("");
      setStatus("已保存");
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim() || !draft.baseUrl.trim()) {
      setStatus("渠道名称与 Base URL 不能为空");
      return;
    }
    const existing = settings.channels.find((channel) => channel.id === draft.id) ?? null;
    const channel = channelFromDraft(draft, existing);
    const channels = existing
      ? settings.channels.map((current) => (current.id === channel.id ? channel : current))
      : [...settings.channels, channel];
    const activeChannelId = settings.activeChannelId ?? channel.id;
    const baseUrlChanged = Boolean(existing) && existing?.baseUrl !== channel.baseUrl;
    const requiresRestart = Boolean(apiKey)
      || (activeChannelId === channel.id && (!existing || baseUrlChanged));

    if (apiKey) {
      if (!isTauri()) {
        setStatus("密钥只能在桌面应用中保存");
        return;
      }
      setBusy(true);
      try {
        await invoke("save_channel_secret", { channelId: channel.id, secret: apiKey });
        setKeyedChannels((ids) => (ids.includes(channel.id) ? ids : [...ids, channel.id]));
      } catch (error) {
        setBusy(false);
        setStatus(errorMessage(error));
        return;
      }
      setBusy(false);
    }
    await commit({ ...settings, channels, activeChannelId }, requiresRestart);
  }

  async function remove(channel: Channel) {
    const channels = settings.channels.filter((current) => current.id !== channel.id);
    const activeChannelId = settings.activeChannelId === channel.id
      ? channels[0]?.id ?? null
      : settings.activeChannelId;
    setPendingDelete(null);
    setKeyedChannels((ids) => ids.filter((id) => id !== channel.id));
    if (isTauri()) {
      await invoke("save_channel_secret", { channelId: channel.id, secret: null }).catch(() => undefined);
    }
    await commit({ ...settings, channels, activeChannelId }, settings.activeChannelId === channel.id);
  }

  return (
    <div className="preferences-section">
      <h3>模型渠道</h3>
      <p>按厂商管理路由与密钥。同一时刻只有一个渠道生效，切换渠道会重启执行核心。</p>
      {VENDORS.map((vendor) => {
        const channels = settings.channels.filter((channel) => channel.vendor === vendor.id);
        return (
          <section className="channel-vendor" key={vendor.id}>
            <header>
              <span><strong>{vendor.label}</strong></span>
              <button
                type="button"
                onClick={() => openDraft({
                  id: createChannel(vendor.id, settings.channels).id,
                  vendor: vendor.id,
                  name: "",
                  baseUrl: vendor.defaultBaseUrl,
                  modelId: "",
                  isNew: true,
                })}
              >
                <Plus aria-hidden="true" />新增渠道
              </button>
            </header>
            <small>{vendor.summary}</small>
            {channels.length === 0 && <p className="channel-empty">尚未配置渠道</p>}
            {channels.map((channel) => (
              <article className={`channel-row ${channel.id === current?.id ? "active" : ""}`} key={channel.id}>
                <div className="channel-row-main">
                  <strong>{channel.name}</strong>
                  <small>
                    {hostOf(channel.baseUrl)} · {channel.conversation.modelId || "目录默认模型"} · {keyedChannels.includes(channel.id) ? "已保存密钥" : "未保存密钥"}
                  </small>
                </div>
                <div className="channel-row-actions">
                  {channel.id === current?.id
                    ? <span className="channel-active-flag"><Check aria-hidden="true" />当前</span>
                    : <button
                        type="button"
                        disabled={busy || switchDisabled}
                        title={switchDisabled ? "有回合正在执行，完成或中断后再切换渠道" : `切换到 ${channel.name}`}
                        onClick={() => void commit({ ...settings, activeChannelId: channel.id }, true)}
                      >激活</button>}
                  <button
                    type="button"
                    aria-label={`编辑 ${channel.name}`}
                    title="编辑渠道"
                    onClick={() => openDraft({ id: channel.id, vendor: channel.vendor, name: channel.name, baseUrl: channel.baseUrl, modelId: channel.conversation.modelId, isNew: false })}
                  >
                    <Pencil aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`删除 ${channel.name}`} title="删除渠道" className="danger" onClick={() => setPendingDelete(channel.id)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                {pendingDelete === channel.id && (
                  <div className="channel-confirm">
                    <span>删除后该渠道的密钥也会移除，历史对话不受影响。</span>
                    <button type="button" onClick={() => setPendingDelete(null)}>取消</button>
                    <button type="button" className="danger" onClick={() => void remove(channel)}>确认删除</button>
                  </div>
                )}
              </article>
            ))}
          </section>
        );
      })}
      {draft && (
        <section className="channel-editor">
          <header><strong>{draft.isNew ? `新增 ${vendorDescriptor(draft.vendor).label} 渠道` : "编辑渠道"}</strong></header>
          <label className="preferences-field"><span>名称</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如 官方直连、备用中转" /></label>
          <label className="preferences-field"><span>Base URL</span><input value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} /></label>
          <label className="preferences-field"><span>API Key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="保留为空则继续使用已保存的密钥" autoComplete="off" /></label>
          <label className="preferences-field"><span>默认模型 ID</span><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} placeholder="留空则使用该渠道目录的默认模型" /></label>
          <small className="preferences-hint">密钥写入 Windows 凭据管理器；前端只能写入，不能读回。</small>
          <div className="channel-editor-actions">
            <button type="button" className="secondary-button" disabled={probing || busy} onClick={() => void testConnection()}>{probing ? "测试中…" : "测试连接"}</button>
            <button type="button" className="secondary-button" onClick={() => { setDraft(null); setApiKey(""); setProbe(null); }}>取消</button>
            <button type="button" className="primary-button" disabled={busy} onClick={() => void saveDraft()}>{busy ? "保存中…" : "保存渠道"}</button>
          </div>
          {probe && (
            <small className={`channel-probe ${probe.ok ? "ok" : "error"}`} role="status">
              {probe.ok ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
              {probe.message}
            </small>
          )}
        </section>
      )}
      {status && <div className="form-status">{status}</div>}
    </div>
  );
}