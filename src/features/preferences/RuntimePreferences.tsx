import { ShieldCheck } from "lucide-react";
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
      <CodexHomeCard path={codexHome} disabled={codexHomeDisabled} onRestart={onRestart} />
    </div>
  );
}
