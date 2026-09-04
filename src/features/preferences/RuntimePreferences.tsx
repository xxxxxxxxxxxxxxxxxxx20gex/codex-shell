import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { APP_VERSION, RELEASES_LATEST_URL } from "../../appVersion";
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

  async function openLatestRelease() {
    setUpdateError("");
    try {
      await openUrl(RELEASES_LATEST_URL);
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "无法打开更新页面");
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
        <p>打开官方 GitHub Release 页面，获取最新的 Windows 安装包。</p>
        <button className="secondary-button" type="button" onClick={() => void openLatestRelease()}>
          检查更新
        </button>
        {updateError && <small className="update-preferences-error" role="alert">{updateError}</small>}
      </section>
      <CodexHomeCard path={codexHome} disabled={codexHomeDisabled} onRestart={onRestart} />
    </div>
  );
}
