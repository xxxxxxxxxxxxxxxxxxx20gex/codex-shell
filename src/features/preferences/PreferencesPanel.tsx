import { useEffect, useRef, useState } from "react";
import { Activity, Maximize2, Minimize2, Minus, Palette, Save, ServerCog, Settings, UserRound, Waypoints, X } from "lucide-react";
import type { WindowsSandboxReadiness } from "../../generated/app-server/v2/WindowsSandboxReadiness";
import type { WindowsSandboxSetupMode } from "../../generated/app-server/v2/WindowsSandboxSetupMode";
import { ProviderChannelsPanel } from "../models/ProviderChannelsPanel";
import type { PersonalizationSettings, ProviderSettings, ThemePreference } from "../models/types";
import type { RuntimeLogStore } from "../runtime/runtimeLogStore";
import type { RuntimeNoticeStore } from "../runtime/runtimeNoticeStore";
import { DiagnosticsPreferences } from "./DiagnosticsPreferences";
import { RuntimePreferences } from "./RuntimePreferences";
import "./PreferencesPanel.css";

interface Props {
  settings: PersonalizationSettings;
  providerSettings: ProviderSettings;
  onSaveProviderSettings: (settings: ProviderSettings, requiresRestart?: boolean) => Promise<void>;
  providerSwitchBlocked?: boolean;
  initialSection?: PreferencesSection;
  codexHome: string;
  codexHomeDisabled: boolean;
  windowsSandboxReadiness: WindowsSandboxReadiness | null;
  noticeStore: RuntimeNoticeStore;
  logStore: RuntimeLogStore;
  onSetupWindowsSandbox: (mode: WindowsSandboxSetupMode) => Promise<boolean>;
  onRestart: () => Promise<void>;
  onClose: () => void;
  onSave: (settings: PersonalizationSettings) => Promise<void>;
}

export type PreferencesSection = "personalization" | "appearance" | "providers" | "runtime" | "diagnostics";

const themeOptions: Array<{ value: ThemePreference; label: string; description: string }> = [
  { value: "dark", label: "深色", description: "适合长时间工作" },
  { value: "light", label: "浅色", description: "明亮的工作台" },
  { value: "system", label: "跟随系统", description: "使用 Windows 外观设置" },
];

export function PreferencesPanel({
  settings,
  providerSettings,
  onSaveProviderSettings,
  providerSwitchBlocked = false,
  initialSection = "personalization",
  codexHome,
  codexHomeDisabled,
  windowsSandboxReadiness,
  noticeStore,
  logStore,
  onSetupWindowsSandbox,
  onRestart,
  onClose,
  onSave,
}: Props) {
  const [section, setSection] = useState<PreferencesSection>(initialSection);
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [maximized, setMaximized] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (minimized) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]');
        const visible = Array.from(controls ?? []).filter((element) => element.getClientRects().length > 0);
        const first = visible[0];
        const last = visible[visible.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [minimized, onClose]);

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      await onSave({ ...draft, customInstructions: draft.customInstructions.trim() });
      setStatus("已保存");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    {minimized && <button className="preferences-restore secondary-button" onClick={() => setMinimized(false)} title="恢复设置"><Settings aria-hidden="true" />恢复设置</button>}
    <div className="modal-backdrop preferences-backdrop" hidden={minimized} onMouseDown={onClose}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label="设置" tabIndex={-1} className={`preferences-modal${maximized ? " maximized" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="preferences-header">
          <h2>设置</h2>
          <div className="preferences-window-actions">
            <button className="close-button" onClick={() => setMinimized(true)} aria-label="最小化设置" title="最小化设置"><Minus aria-hidden="true" /></button>
            <button className="close-button" onClick={() => setMaximized(!maximized)} aria-label={maximized ? "还原设置窗口" : "最大化设置"} title={maximized ? "还原设置窗口" : "最大化设置"}>{maximized ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button>
            <button className="close-button" onClick={onClose} aria-label="关闭设置" title="关闭设置"><X aria-hidden="true" /></button>
          </div>
        </header>
        <div className="preferences-layout">
          <nav className="preferences-nav" aria-label="设置分类">
            <button className={section === "personalization" ? "active" : ""} onClick={() => setSection("personalization")}><UserRound aria-hidden="true" /><span>个性化提示词</span></button>
            <button className={section === "appearance" ? "active" : ""} onClick={() => setSection("appearance")}><Palette aria-hidden="true" /><span>外观</span></button>
            <button className={section === "providers" ? "active" : ""} onClick={() => setSection("providers")}><Waypoints aria-hidden="true" /><span>模型渠道</span></button>
            <button className={section === "runtime" ? "active" : ""} onClick={() => setSection("runtime")}><ServerCog aria-hidden="true" /><span>运行环境</span></button>
            <button className={section === "diagnostics" ? "active" : ""} onClick={() => setSection("diagnostics")}><Activity aria-hidden="true" /><span>诊断</span></button>
          </nav>
          <div className="preferences-content">
            {section === "personalization" && (
              <div className="preferences-section">
                <h3>个性化提示词</h3>
                <p>告诉 Codex 你希望它如何协作。保存后只会在新建对话时作为原生 developer instructions 发送。</p>
                <label className="preferences-field"><span>自定义提示词</span><textarea value={draft.customInstructions} onChange={(event) => setDraft({ ...draft, customInstructions: event.target.value })} placeholder="例如：回答时优先给出结论，代码改动前先说明风险。" rows={8} /></label>
                <small className="preferences-hint">不会改写历史 Session，也不会注入到已经开始的对话中。</small>
              </div>
            )}
            {section === "appearance" && (
              <div className="preferences-section">
                <h3>外观</h3>
                <p>选择 Codex Shell 的界面主题。</p>
                <div className="theme-options" role="radiogroup" aria-label="界面主题">
                  {themeOptions.map((option) => <button key={option.value} role="radio" aria-checked={draft.theme === option.value} className={`theme-option ${draft.theme === option.value ? "active" : ""}`} onClick={() => setDraft({ ...draft, theme: option.value })}><span className={`theme-swatch ${option.value}`} aria-hidden="true" /><span><strong>{option.label}</strong><small>{option.description}</small></span></button>)}
                </div>
              </div>
            )}
            {section === "providers" && <ProviderChannelsPanel settings={providerSettings} onSave={onSaveProviderSettings} switchDisabled={providerSwitchBlocked} />}
            {section === "runtime" && <RuntimePreferences codexHome={codexHome} codexHomeDisabled={codexHomeDisabled} windowsSandboxReadiness={windowsSandboxReadiness} onSetupWindowsSandbox={onSetupWindowsSandbox} onRestart={onRestart} />}
            {section === "diagnostics" && <DiagnosticsPreferences noticeStore={noticeStore} logStore={logStore} />}
            {status && <div className="form-status">{status}</div>}
          </div>
        </div>
        <footer><button className="secondary-button" onClick={onClose}>{section === "providers" ? "关闭" : "取消"}</button>{section !== "providers" && <button className="primary-button" onClick={() => void save()} disabled={saving}><Save aria-hidden="true" />{saving ? "保存中…" : "保存"}</button>}</footer>
      </section>
    </div>
    </>
  );
}
