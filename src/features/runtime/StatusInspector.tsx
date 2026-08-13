import type { WindowsSandboxReadiness } from "../../generated/app-server/v2/WindowsSandboxReadiness";
import type { WindowsSandboxSetupMode } from "../../generated/app-server/v2/WindowsSandboxSetupMode";
import { CodexHomeCard } from "./CodexHomeCard";
import { RuntimeNoticeList } from "./RuntimeNoticeList";
import type { RuntimeNoticeStore } from "./runtimeNoticeStore";

interface Props {
  turnCount: number;
  threadId: string | null;
  projectPath: string | null;
  projectSource: "default" | "selected" | "thread" | "waiting";
  usingDefaultProjectDirectory: boolean;
  canUseDefaultProjectDirectory: boolean;
  codexHome: string;
  codexHomeDisabled: boolean;
  noticeStore: RuntimeNoticeStore;
  windowsSandboxReadiness: WindowsSandboxReadiness | null;
  onBrowseProject: () => void;
  onUseDefaultProjectDirectory: () => void;
  onSetupWindowsSandbox: (mode: WindowsSandboxSetupMode) => Promise<boolean>;
  onRestart: () => Promise<void>;
}

const SANDBOX_LABELS: Record<WindowsSandboxReadiness, string> = {
  ready: "已就绪",
  notConfigured: "未配置",
  updateRequired: "需要更新",
};

export function StatusInspector(props: Props) {
  return (
    <>
      <div className="inspector-card"><div className="card-title"><span>本地会话</span><i>{props.turnCount} 回合</i></div><strong>{props.threadId || "尚未创建"}</strong><p>{props.threadId ? "当前 Session 已由 app-server 持久化。" : "创建对话后会自动持久化，重新启动软件仍可恢复。"}</p></div>
      <div className="inspector-card workspace-status-card">
        <div className="card-title"><span>当前项目</span><i>{props.projectSource}</i></div>
        <strong>{props.projectPath || "正在准备默认项目目录"}</strong>
        <p>{props.usingDefaultProjectDirectory ? "Codex Shell 按日期维护的默认项目目录；选择项目后，新对话会使用该目录。" : "当前 Thread 的项目目录；相对路径命令、文件搜索和浏览都以此为基准。"}</p>
        <div className="status-card-actions">
          <button className="secondary-button" disabled={!props.projectPath} onClick={props.onBrowseProject}>浏览项目文件</button>
          {!props.usingDefaultProjectDirectory && props.canUseDefaultProjectDirectory && <button className="secondary-button" onClick={props.onUseDefaultProjectDirectory}>使用今日默认项目</button>}
        </div>
      </div>
      <div className="inspector-card sandbox-status-card">
        <div className="card-title"><span>Windows Sandbox</span><i>{props.windowsSandboxReadiness ? SANDBOX_LABELS[props.windowsSandboxReadiness] : "检查中"}</i></div>
        <p>{props.windowsSandboxReadiness === "ready" ? "app-server 原生 Windows 沙箱已可用。" : "沙箱可降低本地命令和文件操作的风险。"}</p>
        {props.windowsSandboxReadiness && props.windowsSandboxReadiness !== "ready" && (
          <button className="secondary-button" onClick={() => void props.onSetupWindowsSandbox("elevated")}>使用管理员权限配置</button>
        )}
      </div>
      <RuntimeNoticeList store={props.noticeStore} />
      <CodexHomeCard path={props.codexHome} disabled={props.codexHomeDisabled} onRestart={props.onRestart} />
    </>
  );
}
