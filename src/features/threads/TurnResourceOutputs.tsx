import { FileSpreadsheet, FileText, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { ImageAttachmentPreview } from "../attachments/AttachmentGallery";

interface Props {
  items: ThreadItem[];
  readFile?: (path: string) => Promise<string>;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenInExplorer?: (path: string) => void | Promise<void>;
}

function baseName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function isImagePath(path: string) {
  // SVG is a renderable image artifact too. Keep it in the visual resource
  // gallery instead of treating a generated SVG as a generic downloadable
  // file change.
  return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(path);
}

/** Only resources that have a useful visual/document representation belong in the turn summary. */
function resourceKind(path: string): "image" | "pdf" | "spreadsheet" | null {
  if (isImagePath(path)) return "image";
  if (/\.pdf$/i.test(path)) return "pdf";
  if (/\.(?:csv|ods|xls|xlsx)$/i.test(path)) return "spreadsheet";
  return null;
}

export function TurnResourceOutputs({ items, readFile, onOpenPath, onOpenInExplorer }: Props) {
  const paths = new Set<string>();
  const images: string[] = [];
  const files: string[] = [];
  items.forEach((item) => {
    if (item.type === "imageView" && !paths.has(item.path)) {
      paths.add(item.path);
      images.push(item.path);
    }
    if (item.type === "imageGeneration" && item.savedPath && !paths.has(item.savedPath)) {
      paths.add(item.savedPath);
      images.push(item.savedPath);
    }
    if (item.type === "fileChange") item.changes.forEach((change) => {
      if (paths.has(change.path)) return;
      paths.add(change.path);
      const kind = resourceKind(change.path);
      if (kind === "image") images.push(change.path);
      else if (kind) files.push(change.path);
    });
  });
  if (images.length === 0 && files.length === 0) return null;
  return <section className="turn-resource-outputs" aria-label="本轮产出">
    <header><strong>本轮产出</strong><small>{images.length + files.length} 个资源</small></header>
    {images.length > 0 && <div className="turn-resource-images">
      {images.map((path) => readFile
        ? <ImageAttachmentPreview key={path} path={path} name={baseName(path)} readFile={readFile} onOpenPath={onOpenPath} onOpenInExplorer={onOpenInExplorer} />
        : <span className="turn-resource-unavailable" key={path}><ImageIcon aria-hidden="true" />{baseName(path)}</span>)}
    </div>}
    {files.length > 0 && <ul className="turn-resource-files">
      {files.map((path) => <li key={path}>
        {resourceKind(path) === "spreadsheet" ? <FileSpreadsheet aria-hidden="true" /> : <FileText aria-hidden="true" />}<code title={path}>{baseName(path)}</code><small title={path}>{path}</small>
        {onOpenPath && <button type="button" onClick={() => void onOpenPath(path)} title="在文件管理器中打开" aria-label={`打开 ${path}`}><FolderOpen aria-hidden="true" /></button>}
      </li>)}
    </ul>}
  </section>;
}
