import { CodexHomeCard } from "./CodexHomeCard";

interface Props {
  turnCount: number;
  threadId: string | null;
  workspacePath: string | null;
  workspaceKind: "default" | "custom" | "waiting";
  usingManagedWorkspace: boolean;
  canUseDefaultWorkspace: boolean;
  codexHome: string;
  codexHomeDisabled: boolean;
  onBrowseWorkspace: () => void;
  onUseDefaultWorkspace: () => void;
  onRestart: () => Promise<void>;
}

export function StatusInspector(props: Props) {
  return (
    <>
      <div className="inspector-card"><div className="card-title"><span>本地会话</span><i>{props.turnCount} 回合</i></div><strong>{props.threadId || "尚未创建"}</strong><p>{props.threadId ? "当前 Session 已由 app-server 持久化。" : "创建对话后会自动持久化，重新启动软件仍可恢复。"}</p></div>
      <div className="inspector-card workspace-status-card">
        <div className="card-title"><span>当前工作区</span><i>{props.workspaceKind}</i></div>
        <strong>{props.workspacePath || "正在准备默认工作区"}</strong>
        <p>{props.usingManagedWorkspace ? "Codex Shell 按日期维护的默认工作区；左侧仅展示用户主动选择的项目。" : "用户选择的项目目录；新 Session 将在这里创建。"}</p>
        <div className="status-card-actions">
          <button className="secondary-button" disabled={!props.workspacePath} onClick={props.onBrowseWorkspace}>浏览文件</button>
          {!props.usingManagedWorkspace && props.canUseDefaultWorkspace && <button className="secondary-button" onClick={props.onUseDefaultWorkspace}>使用今日默认</button>}
        </div>
      </div>
      <CodexHomeCard path={props.codexHome} disabled={props.codexHomeDisabled} onRestart={props.onRestart} />
    </>
  );
}
