import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { errorMessage } from "../../shared/errors";

interface Props {
  onSelectImages: (paths: string[]) => void;
  onSelectFiles: (paths: string[]) => void;
  onError: (message: string) => void;
}

export function AttachmentMenu({ onSelectImages, onSelectFiles, onError }: Props) {
  const [openState, setOpenState] = useState(false);

  async function chooseImages() {
    try {
      const selected = await open({ multiple: true, directory: false, title: "添加图片", filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp"] }] });
      if (Array.isArray(selected)) onSelectImages(selected);
      else if (typeof selected === "string") onSelectImages([selected]);
      setOpenState(false);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  async function chooseFiles() {
    try {
      const selected = await open({ multiple: true, directory: false, title: "添加文件" });
      if (Array.isArray(selected)) onSelectFiles(selected);
      else if (typeof selected === "string") onSelectFiles([selected]);
      setOpenState(false);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  return (
    <div className="attachment-menu-anchor">
      <button type="button" className={`attachment-button${openState ? " active" : ""}`} aria-label="添加附件" title="添加图片或文件" onClick={() => setOpenState((current) => !current)}>＋</button>
      {openState && <div className="attachment-menu" role="menu" aria-label="添加附件">
        <strong>添加</strong>
        <button type="button" role="menuitem" onClick={() => void chooseImages()}>◉ <span>添加图片</span><small>PNG、JPG、GIF、WebP</small></button>
        <button type="button" role="menuitem" onClick={() => void chooseFiles()}>⊙ <span>添加文件</span><small>作为文件引用发送</small></button>
      </div>}
    </div>
  );
}
