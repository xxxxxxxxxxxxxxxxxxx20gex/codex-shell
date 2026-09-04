import { check } from "@tauri-apps/plugin-updater";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { APP_VERSION } from "../../appVersion";
import type { WindowsSandboxReadiness } from "../../generated/app-server/v2/WindowsSandboxReadiness";
import type { WindowsSandboxSetupMode } from "../../generated/app-server/v2/WindowsSandboxSetupMode";
import { CodexHomeCard } from "../runtime/CodexHomeCard";

interface Props {
  codexHome: string;
  codexHomeDisabled: boolean;
  windowsSandboxReadiness: WindowsSandboxReadiness | null;
  onSetupWindowsSandbox: (mode: WindowsSandboxSetupMode) => Promise<boolean>;
  onRestart: () => Promise<void>;
}

const SANDBOX_LABELS: Record<WindowsSandboxReadiness, string> = {
  ready: "已就绪",
  notConfigured: "未配置",
  updateRequired: "需要更新",
};

export function RuntimePreferences({
  codexHome,
  codexHomeDisabled,
  windowsSandboxReadiness,
  onSetupWindowsSandbox,
  onRestart,
}: Props) {
  const [updateError, setUpdateError] = useState("");
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "installing" | "current">("idle");

  async function installLatestUpdate() {
    setUpdateError("");
    setUpdateState("checking");
    try {
      const update = await check();
      if (!update) {
        setUpdateState("current");
        return;
      }
      setUpdateState("installing");
      await update.downloadAndInstall();
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "更新检查或安装失败");
      setUpdateState("idle");
    }
  }

  return (
    <div className="preferences-section">
      <h3>运行环境</h3>
      <p>管理 Codex Shell 独立数据目录和 Windows 命令隔离能力。</p>
      <section className="preferences-runtime-card sandbox-preferences-card">
        <header>
          <span><ShieldCheck aria-hidden="true" />Windows Sandbox</span>
          <i>{windowsSandboxReadiness ? SANDBOX_LABELS[windowsSandboxReadiness] : "检查中"}</i>
        </header>
        <p>{windowsSandboxReadiness === "ready"
          ? "app-server 原生 Windows 沙箱已可用。"
          : "沙箱可降低本地命令和文件操作的风险，配置过程需要管理员权限。"}</p>
        {windowsSandboxReadiness && windowsSandboxReadiness !== "ready" && (
          <button className="secondary-button" onClick={() => void onSetupWindowsSandbox("elevated")}>使用管理员权限配置</button>
        )}
      </section>
      <section className="preferences-runtime-card update-preferences-card">
        <header>
          <span><ExternalLink aria-hidden="true" />Codex Shell 更新</span>
          <i>v{APP_VERSION}</i>
        </header>
        <p>安全检查官方签名更新并安装最新版本。更新时应用会自动重启。</p>
        <button className="secondary-button" type="button" disabled={updateState === "checking" || updateState === "installing"} onClick={() => void installLatestUpdate()}>
          {updateState === "checking" ? "检查中…" : updateState === "installing" ? "下载并安装中…" : updateState === "current" ? "已是最新版本" : "检查并更新"}
        </button>
        {updateState === "current" && <small className="update-preferences-note">当前已是最新版本</small>}
        {updateError && <small className="update-preferences-error" role="alert">{updateError}</small>}
      </section>
      <CodexHomeCard path={codexHome} disabled={codexHomeDisabled} onRestart={onRestart} />
    </div>
  );
}
