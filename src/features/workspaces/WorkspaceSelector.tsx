import { open } from "@tauri-apps/plugin-dialog";
import { errorMessage } from "../../shared/errors";
import { projectName } from "./workspaceState";

interface Props {
  path: string | null;
  disabled: boolean;
  selectionLocked: boolean;
  onExplore: () => void;
  onChange: (path: string | null) => void;
  onError: (message: string) => void;
}

export function WorkspaceSelector({ path, disabled, selectionLocked, onExplore, onChange, onError }: Props) {
  async function chooseProject() {
    try {
      const selected = await open({ directory: true, multiple: false, title: "选择 Codex 项目目录" });
      if (typeof selected === "string") onChange(selected);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  return (
    <div className="workspace-selector">
      {path && (
        <button className="workspace-item" disabled={disabled} onClick={onExplore} title="浏览项目文件">
          <span className="folder-icon">⌁</span>
          <span><strong>{projectName(path)}</strong><small>{path}</small></span>
          <i className="workspace-expand">›</i>
        </button>
      )}
      {!selectionLocked && <div className="workspace-selection-actions">
        <button className="choose-workspace-button" disabled={disabled} onClick={() => void chooseProject()}>
          {path ? "切换项目" : "选择项目"}
        </button>
        {path && <button
          type="button"
          className="clear-workspace-button"
          disabled={disabled}
          onClick={() => onChange(null)}
          aria-label="取消自定义项目"
          title="取消自定义项目"
        >×</button>}
      </div>}
    </div>
  );
}
