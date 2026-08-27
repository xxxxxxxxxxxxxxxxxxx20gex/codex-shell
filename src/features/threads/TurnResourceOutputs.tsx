import { File, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { ImageAttachmentPreview } from "../attachments/AttachmentGallery";

interface Props {
  items: ThreadItem[];
  readFile?: (path: string) => Promise<string>;
  onOpenPath?: (path: string) => void | Promise<void>;
}

function baseName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function isImagePath(path: string) {
  return /\.(?:avif|bmp|gif|jpe?g|png|webp)$/i.test(path);
}

export function TurnResourceOutputs({ items, readFile, onOpenPath }: Props) {
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
      if (isImagePath(change.path)) images.push(change.path);
      else files.push(change.path);
    });
  });
  if (images.length === 0 && files.length === 0) return null;
  return <section className="turn-resource-outputs" aria-label="本轮产出">
    <header><strong>本轮产出</strong><small>{images.length + files.length} 个资源</small></header>
    {images.length > 0 && <div className="turn-resource-images">
      {images.map((path) => readFile
        ? <ImageAttachmentPreview key={path} path={path} name={baseName(path)} readFile={readFile} />
        : <span className="turn-resource-unavailable" key={path}><ImageIcon aria-hidden="true" />{baseName(path)}</span>)}
    </div>}
    {files.length > 0 && <ul className="turn-resource-files">
      {files.map((path) => <li key={path}>
        <File aria-hidden="true" /><code title={path}>{baseName(path)}</code><small title={path}>{path}</small>
        {onOpenPath && <button type="button" onClick={() => void onOpenPath(path)} title="在文件管理器中打开" aria-label={`打开 ${path}`}><FolderOpen aria-hidden="true" /></button>}
      </li>)}
    </ul>}
  </section>;
}
