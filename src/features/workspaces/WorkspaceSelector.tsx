import { open } from "@tauri-apps/plugin-dialog";
import { errorMessage } from "../../shared/errors";
import { projectName } from "./workspaceState";

interface Props {
  path: string | null;
  disabled: boolean;
  onChange: (path: string | null) => void;
  onError: (message: string) => void;
}

export function WorkspaceSelector({ path, disabled, onChange, onError }: Props) {
  async function chooseProject() {
    try {
      const selected = await open({ directory: true, multiple: false, title: "选择 Codex 项目目录" });
      if (typeof selected === "string") onChange(selected);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  return (
    <div className={`composer-workspace-selector${path ? " has-project" : " empty-project"}`}>
      <button
        type="button"
        className="composer-workspace-button"
        disabled={disabled}
        onClick={() => void chooseProject()}
        aria-label={path ? `当前项目：${projectName(path)}` : "选择项目"}
        title={path ? `${path}（点击切换项目）` : "选择项目（可选）"}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="M2.75 6.25v8.5a2 2 0 0 0 2 2h10.5a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H10L8.25 3.5h-3.5a2 2 0 0 0-2 2z" />
        </svg>
        <span>{path ? projectName(path) : "选择项目"}</span>
      </button>
      {path && <button
        type="button"
        className="clear-workspace-button"
        disabled={disabled}
        onClick={() => onChange(null)}
        aria-label="取消自定义项目"
        title="取消自定义项目，使用默认工作区"
      >
        <svg aria-hidden="true" viewBox="0 0 12 12"><path d="m3 3 6 6m0-6L3 9" /></svg>
      </button>}
    </div>
  );
}
