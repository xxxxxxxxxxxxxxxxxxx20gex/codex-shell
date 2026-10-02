import { FileSearch, FileSpreadsheet, FileText, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { ImageAttachmentPreview } from "../attachments/AttachmentGallery";
import { useEffect, useMemo, useState } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { localResourcePath, markdownLinkTarget } from "./MarkdownContent";

interface Props {
  items: ThreadItem[];
  readFile?: (path: string) => Promise<string>;
  pathExists?: (path: string) => Promise<boolean>;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenInExplorer?: (path: string) => void | Promise<void>;
}

function baseName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function resourceKey(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/([a-z]:)/i, "$1").replace(/\/\.\//g, "/").toLowerCase();
}

function isImagePath(path: string) {
  // SVG is a renderable image artifact too. Keep it in the visual resource
  // gallery instead of treating a generated SVG as a generic downloadable
  // file change.
  return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(path);
}

/** Only resources that have a useful visual/document representation belong in the turn summary. */
function resourceKind(path: string): "image" | "pdf" | "spreadsheet" | "document" | null {
  if (isImagePath(path)) return "image";
  if (/\.pdf$/i.test(path)) return "pdf";
  if (/\.(?:csv|ods|xls|xlsx)$/i.test(path)) return "spreadsheet";
  if (/\.(?:md|markdown)$/i.test(path)) return "document";
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
    for (const match of message.text.matchAll(/`([^`\r\n]+\.(?:md|markdown)(?::\d+(?::\d+)?)?)`/gi)) {
      const target = markdownLinkTarget(match[1]);
      if (target?.type === "localPath") result.push(target.value);
    }
  }
  return result;
}

export function TurnResourceOutputs(props: Props) {
  const { items, pathExists } = props;
  const [expanded, setExpanded] = useState(false);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const replies = useMemo(() => [...new Map(replyPaths(items).map((path) => [resourceKey(path), path])).values()], [items]);
  const process = useMemo(() => {
    const seen = new Set(replies.map(resourceKey));
    const result: string[] = [];
    for (const item of items) {
      const candidates = item.type === "imageView" ? [item.path]
        : item.type === "imageGeneration" && item.savedPath ? [item.savedPath]
        : item.type === "fileChange" ? item.changes.filter((change) => change.kind.type !== "delete" && resourceKind(change.path)).map((change) => change.path) : [];
      for (const rawPath of candidates) {
        const path = localResourcePath(rawPath);
        if (!path) continue;
        if (!seen.has(resourceKey(path))) { seen.add(resourceKey(path)); result.push(path); }
      }
    }
    return result;
  }, [items, replies]);
  useEffect(() => {
    if (!pathExists) {
      setMissing(new Set());
      return;
    }
    let cancelled = false;
    const candidates = [...new Set([...replies, ...process])];
    void Promise.all(candidates.map(async (path) => [path, await pathExists(path)] as const)).then((results) => {
      if (!cancelled) setMissing(new Set(results.filter(([, exists]) => !exists).map(([path]) => resourceKey(path))));
    });
    return () => { cancelled = true; };
  }, [pathExists, replies, process]);
  const visibleReplies = replies.filter((path) => !missing.has(resourceKey(path)));
  const visibleProcess = process.filter((path) => !missing.has(resourceKey(path)));
  const replyImages = visibleReplies.filter(isImagePath);
  const replyDocuments = visibleReplies.filter((path) => resourceKind(path) === "document");
  const processFiles = visibleProcess.filter((path) => resourceKind(path) !== "document");
  if (!visibleReplies.length && !visibleProcess.length) return null;
  return <>
    {replyImages.length > 0 && <ResourceList {...props} title="回复中的图片" resources={replyImages} />}
    {replyDocuments.length > 0 && <ResourceList {...props} title="回复中的文档" resources={replyDocuments} />}
    {processFiles.length > 0 && <details className="turn-process-resources" onToggle={(event) => setExpanded(event.currentTarget.open)}><summary>过程资源 · {processFiles.length} 个</summary>{expanded && <ResourceList {...props} title="查看、生成与修改的资源" resources={processFiles} />}</details>}
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
        : <button type="button" className="attachment-file-preview" data-local-path={path} key={path} onClick={() => void onOpenPath?.(path)} disabled={!onOpenPath}><ImageIcon aria-hidden="true" />{baseName(path)}</button>)}
    </div>}
    {files.length > 0 && <ul className="turn-resource-files">
      {files.map((path) => <li key={path} data-local-path={path}>
        {resourceKind(path) === "spreadsheet" ? <FileSpreadsheet aria-hidden="true" /> : <FileText aria-hidden="true" />}<code title={path}>{baseName(path)}</code><small title={path}>{path}</small>
        {(onOpenPath || onOpenInExplorer) && <div className="turn-resource-file-actions">
          {onOpenPath && <button type="button" onClick={() => void onOpenPath(path)} title="打开文件" aria-label={`打开 ${path}`}><FileSearch aria-hidden="true" /></button>}
          {onOpenInExplorer && <button type="button" onClick={() => void onOpenInExplorer(path)} title="在资源管理器中显示" aria-label={`在资源管理器中显示 ${path}`}><FolderOpen aria-hidden="true" /></button>}
        </div>}
      </li>)}
    </ul>}
  </section>;
}
