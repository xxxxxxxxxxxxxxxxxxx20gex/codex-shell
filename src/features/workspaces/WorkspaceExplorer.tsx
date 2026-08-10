import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { FsReadDirectoryEntry } from "../../generated/app-server/v2/FsReadDirectoryEntry";
import { errorMessage } from "../../shared/errors";
import { decodeFilePreview, formatFileSize, type FilePreview } from "./filePreview";
import { joinWorkspacePath, workspaceName, workspaceRelativePath } from "./workspaceState";

interface Props {
  rootPath: string;
  onClose: () => void;
  readDirectory: (path: string) => Promise<FsReadDirectoryEntry[]>;
  readFile: (path: string) => Promise<string>;
}

interface DirectoryState {
  entries: FsReadDirectoryEntry[];
  loading: boolean;
  error: string;
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

export function WorkspaceExplorer({ rootPath, onClose, readDirectory, readFile }: Props) {
  const loadingDirectoriesRef = useRef(new Set<string>());
  const previewRequestRef = useRef(0);
  const [directories, setDirectories] = useState<Record<string, DirectoryState>>({});
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set([rootPath]));
  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const loadDirectory = useCallback(async (path: string) => {
    if (loadingDirectoriesRef.current.has(path)) return;
    loadingDirectoriesRef.current.add(path);
    setDirectories((current) => ({
      ...current,
      [path]: { entries: current[path]?.entries ?? [], loading: true, error: "" },
    }));
    try {
      const entries = await readDirectory(path);
      entries.sort((left, right) => Number(right.isDirectory) - Number(left.isDirectory)
        || left.fileName.localeCompare(right.fileName));
      setDirectories((current) => ({ ...current, [path]: { entries, loading: false, error: "" } }));
    } catch (error) {
      setDirectories((current) => ({
        ...current,
        [path]: { entries: current[path]?.entries ?? [], loading: false, error: errorMessage(error) },
      }));
    } finally {
      loadingDirectoriesRef.current.delete(path);
    }
  }, [readDirectory]);

  useEffect(() => {
    loadingDirectoriesRef.current.clear();
    setDirectories({});
    setExpanded(new Set([rootPath]));
    setFilter("");
    setSelectedPath(null);
    setPreview(null);
    setPreviewError("");
    void loadDirectory(rootPath);
  }, [loadDirectory, rootPath]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function toggleDirectory(path: string) {
    const isExpanded = expanded.has(path);
    setExpanded((current) => {
      const next = new Set(current);
      if (isExpanded) next.delete(path);
      else next.add(path);
      return next;
    });
    if (!isExpanded && !directories[path]) void loadDirectory(path);
  }

  async function selectFile(path: string) {
    const requestId = ++previewRequestRef.current;
    setSelectedPath(path);
    setPreview(null);
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const dataBase64 = await readFile(path);
      if (previewRequestRef.current === requestId) setPreview(decodeFilePreview(path, dataBase64));
    } catch (error) {
      if (previewRequestRef.current === requestId) setPreviewError(errorMessage(error));
    } finally {
      if (previewRequestRef.current === requestId) setPreviewLoading(false);
    }
  }

  function renderDirectory(directory: string, depth: number): ReactNode {
    const state = directories[directory];
    if (!state) return null;
    if (state.loading && state.entries.length === 0) {
      return <p className="explorer-tree-note" style={{ paddingLeft: 16 + depth * 16 }}>读取中…</p>;
    }
    if (state.error) {
      return <button className="explorer-tree-error" onClick={() => void loadDirectory(directory)}>{state.error} · 重试</button>;
    }
    const normalizedFilter = filter.trim().toLocaleLowerCase();
    return state.entries.map((entry) => {
      if (!entry.isDirectory && normalizedFilter
        && !entry.fileName.toLocaleLowerCase().includes(normalizedFilter)) return null;
      const path = joinWorkspacePath(directory, entry.fileName);
      if (entry.isDirectory) {
        const isExpanded = expanded.has(path);
        return (
          <div key={path}>
            <button className="explorer-tree-row directory" style={{ paddingLeft: 10 + depth * 16 }} onClick={() => toggleDirectory(path)} title={path}>
              <i>{isExpanded ? "⌄" : "›"}</i><span className="tree-folder">◆</span><span>{entry.fileName}</span>
            </button>
            {isExpanded && renderDirectory(path, depth + 1)}
          </div>
        );
      }
      if (!entry.isFile) return null;
      return (
        <button key={path} className={`explorer-tree-row file ${selectedPath === path ? "selected" : ""}`} style={{ paddingLeft: 30 + depth * 16 }} onClick={() => void selectFile(path)} title={path}>
          <span className="tree-file">{fileName(path).includes(".") ? "{}" : "·"}</span><span>{entry.fileName}</span>
        </button>
      );
    });
  }

  const previewLines = preview?.kind === "text" ? preview.content.split("\n") : [];

  return (
    <div className="workspace-explorer-layer" role="dialog" aria-modal="true" aria-label="工作区文件浏览器">
      <button className="workspace-explorer-scrim" onClick={onClose} aria-label="关闭工作区文件浏览器" />
      <section className="workspace-explorer-drawer">
        <header className="explorer-header">
          <div><span className="eyebrow">Workspace Explorer</span><strong>{workspaceName(rootPath)}</strong><small>{rootPath}</small></div>
          <button className="explorer-close" onClick={onClose} aria-label="关闭文件浏览器">×</button>
        </header>
        <div className="explorer-body">
          <aside className="explorer-tree-pane">
            <div className="explorer-filter"><span>⌕</span><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="筛选已展开文件…" /></div>
            <button className="explorer-root" onClick={() => toggleDirectory(rootPath)}><i>{expanded.has(rootPath) ? "⌄" : "›"}</i><span>▣</span><strong>{workspaceName(rootPath)}</strong></button>
            <div className="explorer-tree-scroll">{expanded.has(rootPath) && renderDirectory(rootPath, 0)}</div>
          </aside>
          <main className="explorer-preview-pane">
            <div className="explorer-preview-bar">
              <span>{selectedPath ? workspaceRelativePath(rootPath, selectedPath) : "文件预览"}</span>
              {preview && <small>{formatFileSize(preview.byteSize)}</small>}
            </div>
            {!selectedPath && <div className="explorer-empty"><span>⌁</span><strong>选择一个文件</strong><p>在左侧展开目录并单击文件，即可在这里预览内容。</p></div>}
            {previewLoading && <div className="explorer-empty"><span className="preview-spinner">◌</span><strong>正在读取文件…</strong></div>}
            {previewError && <div className="explorer-empty error"><span>!</span><strong>无法预览文件</strong><p>{previewError}</p></div>}
            {preview?.kind === "binary" && <div className="explorer-empty"><span>01</span><strong>二进制文件</strong><p>该文件共 {formatFileSize(preview.byteSize)}，不适合以文本方式显示。</p></div>}
            {preview?.kind === "image" && <div className="explorer-image-preview"><img src={preview.dataUrl} alt={fileName(selectedPath ?? "图片预览")} /></div>}
            {preview?.kind === "text" && <div className="explorer-code-preview">
              {preview.truncated && <div className="preview-truncated">文件较大，仅显示前 200 KB / 4000 行。</div>}
              <pre>{previewLines.map((line, index) => <span className="preview-line" key={index}><i>{index + 1}</i><code>{line || " "}</code></span>)}</pre>
            </div>}
          </main>
        </div>
      </section>
    </div>
  );
}
