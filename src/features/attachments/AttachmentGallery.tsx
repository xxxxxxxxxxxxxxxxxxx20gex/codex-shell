import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, File, FolderOpen, Pencil, Trash2, X } from "lucide-react";
import { errorMessage } from "../../shared/errors";
import type { FileMention, ImageAttachment } from "../runtime/sessionInput";
import { decodeFilePreview, formatFileSize, type FilePreview } from "../workspaces/filePreview";
import "./AttachmentGallery.css";
import { ImageAnnotationCanvas, type ImageAnnotation } from "./ImageAnnotationCanvas";
import { ImageAnnotationContext } from "./ImageAnnotationContext";

type ReadFile = (path: string) => Promise<string>;

interface Props {
  files: FileMention[];
  images: ImageAttachment[];
  readFile: ReadFile;
  onRemoveFile?: (path: string) => void;
  onRemoveImage?: (index: number) => void;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenInExplorer?: (path: string) => void | Promise<void>;
  align?: "start" | "end";
}

type PreviewTarget =
  | { kind: "file"; name: string; path: string }
  | { kind: "image"; name: string; path?: string; url?: string };

function formatImageAnnotations(name: string, annotations: ImageAnnotation[], note: string) {
  const lines = annotations.map((annotation, index) => `${index + 1}. (x: ${(annotation.x * 100).toFixed(1)}%, y: ${(annotation.y * 100).toFixed(1)}%)${annotation.comment.trim() ? ` ${annotation.comment.trim()}` : ""}`);
  return [`图像：${name}（坐标以原图左上角为原点，x 向右、y 向下）`, ...lines, ...(note.trim() ? ["", "补充说明：", note.trim()] : [])].join("\n");
}

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

export function ImageAttachmentPreview({ path, name, readFile, onOpenPath, onOpenInExplorer }: { path: string; name?: string; readFile: ReadFile; onOpenPath?: (path: string) => void | Promise<void>; onOpenInExplorer?: (path: string) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const image: ImageAttachment = { path, name: name ?? path.split(/[\\/]/).pop() ?? path };
  return (
    <>
      <button type="button" data-local-path={path} className="attachment-image-preview session-image-preview" onClick={() => setOpen(true)} title={`预览 ${image.name}`}>
        <ImageThumbnail image={image} readFile={readFile} />
        <span>{image.name}</span>
      </button>
      {open && <AttachmentPreviewDialog target={{ kind: "image", ...image }} readFile={readFile} onClose={() => setOpen(false)} onOpenPath={onOpenPath} onOpenInExplorer={onOpenInExplorer} />}
    </>
  );
}

export function AttachmentPreviewDialog({ target, readFile, onClose, onOpenPath, onOpenInExplorer }: {
  target: PreviewTarget;
  readFile: ReadFile;
  onClose: () => void;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenInExplorer?: (path: string) => void | Promise<void>;
}) {
  const applyAnnotation = useContext(ImageAnnotationContext);
  const local = usePathPreview(target.path, readFile, Boolean(target.path));
  const preview = target.kind === "image" && target.url
    ? { kind: "image" as const, dataUrl: target.url, byteSize: 0 }
    : local.preview;
  const [openError, setOpenError] = useState("");
  const [annotating, setAnnotating] = useState(false);
  const [annotations, setAnnotations] = useState<ImageAnnotation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const onApplyAnnotation = applyAnnotation && preview?.kind === "image" ? (text: string) => {
    const image: ImageAttachment = target.path
      ? { name: target.name, path: target.path }
      : { name: target.name, url: preview.dataUrl };
    applyAnnotation(image, text);
  } : null;

  async function openResource() {
    if (!target.path || !onOpenPath) return;
    setOpenError("");
    try {
      if (onOpenInExplorer) await onOpenInExplorer(target.path);
      else if (onOpenPath) await onOpenPath(target.path);
    } catch (error) {
      setOpenError(errorMessage(error));
    }
  }

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
          <div className="attachment-preview-actions">
            {target.kind === "image" && preview?.kind === "image" && onApplyAnnotation && <button type="button" onClick={() => { setAnnotating((value) => !value); setSelected(null); }} aria-label={annotating ? "结束图片批注" : "添加图片批注"} title={annotating ? "结束图片批注" : "添加图片批注"}><Pencil aria-hidden="true" /></button>}
            {target.path && (onOpenInExplorer || onOpenPath) && <button type="button" onClick={() => void openResource()} aria-label="在资源管理器中打开" title="在资源管理器中打开"><FolderOpen aria-hidden="true" /></button>}
            <button type="button" onClick={onClose} aria-label="关闭附件预览"><X aria-hidden="true" /></button>
          </div>
        </header>
        <div className={`attachment-preview-content ${annotating ? "is-annotating" : ""}`}>
          {openError && <div className="attachment-preview-state error"><strong>无法打开资源管理器</strong><p>{openError}</p></div>}
          {local.loading && <div className="attachment-preview-state"><span className="attachment-loading" /><strong>正在读取附件…</strong></div>}
          {local.error && <div className="attachment-preview-state error"><strong>无法预览附件</strong><p>{local.error}</p></div>}
          {preview?.kind === "image" && <ImageAnnotationCanvas source={preview.dataUrl} name={target.name} editing={annotating} annotations={annotations} selected={selected} onAdd={(point) => { setAnnotations((current) => { setSelected(current.length); return [...current, point]; }); }} onSelect={setSelected} />}
          {preview?.kind === "pdf" && <iframe className="attachment-pdf-preview" src={preview.dataUrl} title={`预览 ${target.name}`} />}
          {preview?.kind === "text" && <pre>{preview.content}</pre>}
          {preview?.kind === "binary" && <div className="attachment-preview-state"><strong>{fileKind(target.name)}</strong><p>{formatFileSize(preview.byteSize)} · 当前仅支持图片和文本内容预览</p></div>}
          {annotating && <aside className="image-annotation-editor" aria-label="图片批注编辑"><strong>图片批注</strong><small>点击图片添加位置，坐标相对于原图。</small>{selected !== null && <><label>批注 {selected + 1}<textarea value={annotations[selected]?.comment ?? ""} onChange={(event) => setAnnotations((current) => current.map((item, index) => index === selected ? { ...item, comment: event.target.value } : item))} placeholder="描述这个位置" /></label><button type="button" onClick={() => { setAnnotations((current) => current.filter((_, index) => index !== selected)); setSelected(null); }}><Trash2 aria-hidden="true" />删除位置</button></>}<label>补充说明<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="给模型的整体说明" /></label>{onApplyAnnotation && <button type="button" className="image-annotation-apply" disabled={annotations.length === 0} onClick={() => { onApplyAnnotation(formatImageAnnotations(target.name, annotations, note)); onClose(); }}><Check aria-hidden="true" />插入到消息</button>}</aside>}
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
  onOpenPath,
  onOpenInExplorer,
  align = "start",
}: Props) {
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  if (files.length === 0 && images.length === 0) return null;

  return (
    <>
      <div className={`attachment-gallery align-${align}`} aria-label="附件">
        {images.map((image, index) => (
          <div className="attachment-image-card" key={image.path ?? image.url ?? index}>
            <button type="button" className="attachment-image-preview" data-local-path={image.path} onClick={() => setPreviewTarget({ kind: "image", ...image })} title={`预览 ${image.name}`}>
              <ImageThumbnail image={image} readFile={readFile} />
              <span>{image.name}</span>
            </button>
            {onRemoveImage && <button type="button" className="attachment-remove" onClick={() => onRemoveImage(index)} aria-label={`移除 ${image.name}`}><X aria-hidden="true" /></button>}
          </div>
        ))}
        {files.map((file) => (
          <div className="attachment-file-card" key={file.path}>
            <button type="button" className="attachment-file-preview" data-local-path={file.path} onClick={() => setPreviewTarget({ kind: "file", ...file })} title={file.path}>
              <File className="attachment-file-icon" aria-hidden="true" />
              <span><strong>{file.name}</strong><small>{fileKind(file.name)}</small></span>
            </button>
            {onRemoveFile && <button type="button" className="attachment-remove" onClick={() => onRemoveFile(file.path)} aria-label={`移除 ${file.name}`}><X aria-hidden="true" /></button>}
          </div>
        ))}
      </div>
      {previewTarget && <AttachmentPreviewDialog target={previewTarget} readFile={readFile} onClose={() => setPreviewTarget(null)} onOpenPath={onOpenPath} onOpenInExplorer={onOpenInExplorer} />}
    </>
  );
}
