import { open } from "@tauri-apps/plugin-dialog";
import { workspaceName } from "./workspaceState";

interface Props {
  path: string | null;
  disabled: boolean;
  onExplore: () => void;
  onChange: (path: string | null) => void;
  onError: (message: string) => void;
}

export function WorkspaceSelector({ path, disabled, onExplore, onChange, onError }: Props) {
  async function chooseWorkspace() {
    try {
      const selected = await open({ directory: true, multiple: false, title: "选择 Codex 工作区" });
      if (typeof selected === "string") onChange(selected);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="workspace-selector">
      {path && (
        <button className="workspace-item" disabled={disabled} onClick={onExplore} title="浏览工作区文件">
          <span className="folder-icon">⌁</span>
          <span><strong>{workspaceName(path)}</strong><small>{path}</small></span>
          <i className="workspace-expand">›</i>
        </button>
      )}
      <button className="choose-workspace-button" disabled={disabled} onClick={() => void chooseWorkspace()}>
        {path ? "更换工作区" : "选择工作区"}
      </button>
    </div>
  );
}
