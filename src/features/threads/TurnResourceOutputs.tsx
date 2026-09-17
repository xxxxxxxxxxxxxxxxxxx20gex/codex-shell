import { FileSpreadsheet, FileText, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { ImageAttachmentPreview } from "../attachments/AttachmentGallery";
import { useState } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { markdownLinkTarget } from "./MarkdownContent";

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

const parser = unified().use(remarkParse).use(remarkGfm);

function replyPaths(items: ThreadItem[]) {
  const result: string[] = [];
  const messages = items.filter((item) => item.type === "agentMessage" && item.phase !== "commentary");
  for (const message of messages) {
    if (message.type !== "agentMessage") continue;
    const tree = parser.parse(message.text);
    const definitions = new Map(tree.children.flatMap((node) => node.type === "definition" ? [[node.identifier, node.url] as const] : []));
    function visit(node: { type: string; url?: string; identifier?: string; children?: typeof tree.children }) {
      const url = node.type === "link" || node.type === "image" ? node.url
        : node.type === "linkReference" || node.type === "imageReference" ? definitions.get(node.identifier!) : undefined;
      const target = url ? markdownLinkTarget(url) : null;
      if (target?.type === "localPath") result.push(target.value);
      node.children?.forEach(visit);
    }
    visit(tree);
  }
  return result;
}

export function TurnResourceOutputs(props: Props) {
  const { items } = props;
  const [expanded, setExpanded] = useState(false);
  const key = (path: string) => path.replace(/\\/g, "/").replace(/^\/([a-z]:)/i, "$1").replace(/\/\.\//g, "/").toLowerCase();
  const replies = [...new Map(replyPaths(items).filter(isImagePath).map((path) => [key(path), path])).values()];
  const seen = new Set(replies.map(key));
  const process: string[] = [];
  for (const item of items) {
    const candidates = item.type === "imageView" ? [item.path]
      : item.type === "imageGeneration" && item.savedPath ? [item.savedPath]
      : item.type === "fileChange" ? item.changes.filter((change) => change.kind.type !== "delete" && resourceKind(change.path)).map((change) => change.path) : [];
    for (const path of candidates) {
      if (!seen.has(key(path))) { seen.add(key(path)); process.push(path); }
    }
  }
  if (!replies.length && !process.length) return null;
  return <>
    {replies.length > 0 && <ResourceList {...props} title="回复中的图片" resources={replies} />}
    {process.length > 0 && <details className="turn-process-resources" onToggle={(event) => setExpanded(event.currentTarget.open)}><summary>过程资源 · {process.length} 个</summary>{expanded && <ResourceList {...props} title="查看、生成与修改的资源" resources={process} />}</details>}
  </>;
}

function ResourceList({ resources, title, readFile, onOpenPath, onOpenInExplorer }: Omit<Props, "items"> & { resources: string[]; title: string }) {
  const paths = new Set<string>();
  const images: string[] = [];
  const files: string[] = [];
  resources.forEach((path) => {
    if (paths.has(path)) return;
    paths.add(path);
    if (isImagePath(path)) images.push(path);
    else files.push(path);
  });
  if (images.length === 0 && files.length === 0) return null;
  return <section className="turn-resource-outputs" aria-label={title}>
    <header><strong>{title}</strong><small>{images.length + files.length} 个资源</small></header>
    {images.length > 0 && <div className="turn-resource-images">
      {images.map((path) => readFile && /^(?:[a-z]:[\\/]|\\\\|\/)/i.test(path)
        ? <ImageAttachmentPreview key={path} path={path} name={baseName(path)} readFile={readFile} onOpenPath={onOpenPath} onOpenInExplorer={onOpenInExplorer} />
        : <button type="button" className="attachment-file-preview" key={path} onClick={() => void onOpenPath?.(path)} disabled={!onOpenPath}><ImageIcon aria-hidden="true" />{baseName(path)}</button>)}
    </div>}
    {files.length > 0 && <ul className="turn-resource-files">
      {files.map((path) => <li key={path}>
        {resourceKind(path) === "spreadsheet" ? <FileSpreadsheet aria-hidden="true" /> : <FileText aria-hidden="true" />}<code title={path}>{baseName(path)}</code><small title={path}>{path}</small>
        {onOpenInExplorer && <button type="button" onClick={() => void onOpenInExplorer(path)} title="在资源管理器中显示" aria-label={`打开 ${path}`}><FolderOpen aria-hidden="true" /></button>}
      </li>)}
    </ul>}
  </section>;
}
