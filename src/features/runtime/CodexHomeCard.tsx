import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { errorMessage } from "../../shared/errors";

interface Props {
  path: string;
  disabled: boolean;
  onRestart: () => Promise<void>;
}

export function CodexHomeCard({ path, disabled, onRestart }: Props) {
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState("");
  const unavailable = disabled || changing;

  async function applyPath(nextPath: string | null) {
    setChanging(true);
    setError("");
    try {
      await invoke<string>("set_codex_home", { path: nextPath });
      await onRestart();
    } catch (changeError) {
      setError(errorMessage(changeError));
    } finally {
      setChanging(false);
    }
  }

  async function choosePath() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择 Codex Shell 数据目录",
        defaultPath: path || undefined,
      });
      if (typeof selected === "string") await applyPath(selected);
    } catch (dialogError) {
      setError(errorMessage(dialogError));
    }
  }

  return (
    <section className="preferences-runtime-card codex-home-card">
      <header>
        <span>CODEX_HOME</span>
        <i>{path ? "isolated" : "waiting"}</i>
      </header>
      <strong>{path || "等待 app-server 初始化"}</strong>
      <p>默认使用 ~/.codex-shell，与官方 ~/.codex 完全隔离。切换自定义目录不会移动或合并已有数据。</p>
      {error && <small className="codex-home-error">{error}</small>}
      <div className="codex-home-actions">
        <button className="secondary-button" disabled={unavailable} onClick={() => void choosePath()}>{changing ? "切换中…" : "选择目录"}</button>
        <button className="secondary-button" disabled={unavailable} onClick={() => void applyPath(null)}>恢复默认</button>
      </div>
      {disabled && <small className="codex-home-note">请等待所有对话执行完成后再切换目录。</small>}
    </section>
  );
}
