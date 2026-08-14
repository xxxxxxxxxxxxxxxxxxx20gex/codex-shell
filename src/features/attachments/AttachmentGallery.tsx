import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { errorMessage } from "../../shared/errors";
import type { FileMention, ImageAttachment } from "../runtime/sessionInput";
import { decodeFilePreview, formatFileSize, type FilePreview } from "../workspaces/filePreview";
import "./AttachmentGallery.css";

type ReadFile = (path: string) => Promise<string>;

interface Props {
  files: FileMention[];
  images: ImageAttachment[];
  readFile: ReadFile;
  onRemoveFile?: (path: string) => void;
  onRemoveImage?: (index: number) => void;
  align?: "start" | "end";
}

type PreviewTarget =
  | { kind: "file"; name: string; path: string }
  | { kind: "image"; name: string; path?: string; url?: string };

function fileKind(name: string) {
  const extension = /\.([^.]+)$/.exec(name)?.[1]?.toLocaleUpperCase();
  return extension ? `${extension} 文件` : "文件";
}

function usePathPreview(path: string | undefined, readFile: ReadFile, enabled: boolean) {
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!path || !enabled) {
      setPreview(null);
      setLoading(false);
      setError("");
      return;
    }
    let disposed = false;
    setPreview(null);
    setLoading(true);
    setError("");
    void readFile(path).then((dataBase64) => {
      if (!disposed) setPreview(decodeFilePreview(path, dataBase64));
    }).catch((reason) => {
      if (!disposed) setError(errorMessage(reason));
    }).finally(() => {
      if (!disposed) setLoading(false);
    });
    return () => { disposed = true; };
  }, [enabled, path, readFile]);

  return { preview, loading, error };
}

function ImageThumbnail({ image, readFile }: { image: ImageAttachment; readFile: ReadFile }) {
  const local = usePathPreview(image.path, readFile, Boolean(image.path));
  const source = image.url ?? (local.preview?.kind === "image" ? local.preview.dataUrl : null);
  if (source) return <img src={source} alt={image.name} />;
  if (local.loading) return <span className="attachment-loading" aria-label={`正在读取 ${image.name}`} />;
  return <span className="attachment-image-fallback" aria-hidden="true">IMG</span>;
}

function AttachmentPreviewDialog({ target, readFile, onClose }: {
  target: PreviewTarget;
  readFile: ReadFile;
  onClose: () => void;
}) {
  const local = usePathPreview(target.path, readFile, Boolean(target.path));
  const preview = target.kind === "image" && target.url
    ? { kind: "image" as const, dataUrl: target.url, byteSize: 0 }
    : local.preview;

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="attachment-preview-layer" role="dialog" aria-modal="true" aria-label={`预览 ${target.name}`}>
      <button className="attachment-preview-scrim" type="button" onClick={onClose} aria-label="关闭附件预览" />
      <section className="attachment-preview-dialog">
        <header>
          <div><strong>{target.name}</strong><small>{target.path ?? "剪贴板图片"}</small></div>
          <button type="button" onClick={onClose} aria-label="关闭附件预览">×</button>
        </header>
        <div className="attachment-preview-content">
          {local.loading && <div className="attachment-preview-state"><span className="attachment-loading" /><strong>正在读取附件…</strong></div>}
          {local.error && <div className="attachment-preview-state error"><strong>无法预览附件</strong><p>{local.error}</p></div>}
          {preview?.kind === "image" && <img src={preview.dataUrl} alt={target.name} />}
          {preview?.kind === "text" && <pre>{preview.content}</pre>}
          {preview?.kind === "binary" && <div className="attachment-preview-state"><strong>{fileKind(target.name)}</strong><p>{formatFileSize(preview.byteSize)} · 当前仅支持图片和文本内容预览</p></div>}
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function AttachmentGallery({
  files,
  images,
  readFile,
  onRemoveFile,
  onRemoveImage,
  align = "start",
}: Props) {
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  if (files.length === 0 && images.length === 0) return null;

  return (
    <>
      <div className={`attachment-gallery align-${align}`} aria-label="附件">
        {images.map((image, index) => (
          <div className="attachment-image-card" key={image.path ?? image.url ?? index}>
            <button type="button" className="attachment-image-preview" onClick={() => setPreviewTarget({ kind: "image", ...image })} title={`预览 ${image.name}`}>
              <ImageThumbnail image={image} readFile={readFile} />
              <span>{image.name}</span>
            </button>
            {onRemoveImage && <button type="button" className="attachment-remove" onClick={() => onRemoveImage(index)} aria-label={`移除 ${image.name}`}>×</button>}
          </div>
        ))}
        {files.map((file) => (
          <div className="attachment-file-card" key={file.path}>
            <button type="button" className="attachment-file-preview" onClick={() => setPreviewTarget({ kind: "file", ...file })} title={file.path}>
              <span className="attachment-file-icon" aria-hidden="true" />
              <span><strong>{file.name}</strong><small>{fileKind(file.name)}</small></span>
            </button>
            {onRemoveFile && <button type="button" className="attachment-remove" onClick={() => onRemoveFile(file.path)} aria-label={`移除 ${file.name}`}>×</button>}
          </div>
        ))}
      </div>
      {previewTarget && <AttachmentPreviewDialog target={previewTarget} readFile={readFile} onClose={() => setPreviewTarget(null)} />}
    </>
  );
}
