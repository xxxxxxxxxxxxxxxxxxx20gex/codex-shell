import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { errorMessage } from "../../shared/errors";

interface Props {
  onSelectPaths: (paths: string[]) => void;
  onError: (message: string) => void;
}

export function AttachmentMenu({ onSelectPaths, onError }: Props) {
  const [openState, setOpenState] = useState(false);

  async function choosePaths() {
    try {
      const selected = await open({ multiple: true, directory: false, title: "添加文件和文件夹" });
      if (Array.isArray(selected)) onSelectPaths(selected);
      else if (typeof selected === "string") onSelectPaths([selected]);
      setOpenState(false);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  return (
    <div className="attachment-menu-anchor">
      <button type="button" className={`attachment-button${openState ? " active" : ""}`} aria-label="添加附件" title="添加文件和文件夹" onClick={() => setOpenState((current) => !current)}>＋</button>
      {openState && <div className="attachment-menu" role="menu" aria-label="添加附件">
        <strong>添加</strong>
        <button type="button" role="menuitem" onClick={() => void choosePaths()}>⊙ <span>添加文件和文件夹</span><small>图片、文件；文件夹可直接拖入</small></button>
      </div>}
    </div>
  );
}
