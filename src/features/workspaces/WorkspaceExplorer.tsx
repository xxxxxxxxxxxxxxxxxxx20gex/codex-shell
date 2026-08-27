import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCog,
  FileWarning,
  Folder,
  FolderOpen,
  FolderRoot,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Search,
  X,
} from "lucide-react";
import type { FsReadDirectoryEntry } from "../../generated/app-server/v2/FsReadDirectoryEntry";
import { errorMessage } from "../../shared/errors";
import type { WatchWorkspacePath } from "../runtime/useWorkspaceFiles";
import { decodeFilePreview, formatFileSize, type FilePreview } from "./filePreview";
import { useWorkspaceDirectoryWatches } from "./useWorkspaceDirectoryWatches";
import { joinProjectPath, projectName, projectRelativePath } from "./workspaceState";
import "./WorkspaceExplorer.css";

interface Props {
  rootPath: string;
  initialFilePath?: string | null;
  onClose: () => void;
  readDirectory: (path: string) => Promise<FsReadDirectoryEntry[]>;
  readFile: (path: string) => Promise<string>;
  watchPath: WatchWorkspacePath;
  maximized: boolean;
  onToggleMaximize: () => void;
}

interface DirectoryState {
  entries: FsReadDirectoryEntry[];
  loading: boolean;
  error: string;
}

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path;
}

function normalizedPath(path: string) {
  return path.replace(/\\/g, "/").replace(/\/+$/, "").toLocaleLowerCase();
}

function pathsAffectFile(changedPaths: string[], filePath: string) {
  const file = normalizedPath(filePath);
  return changedPaths.some((path) => {
    const changed = normalizedPath(path);
    return file === changed || file.startsWith(`${changed}/`);
  });
}

export function WorkspaceExplorer({ rootPath, initialFilePath = null, onClose, readDirectory, readFile, watchPath, maximized, onToggleMaximize }: Props) {
  const loadingDirectoriesRef = useRef(new Set<string>());
  const previewRequestRef = useRef(0);
  const selectedPathRef = useRef<string | null>(null);
  const [directories, setDirectories] = useState<Record<string, DirectoryState>>({});
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set([rootPath]));
  const [filter, setFilter] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [watchError, setWatchError] = useState("");
  const [treeWidth, setTreeWidth] = useState(285);
  const treeWidthRef = useRef(285);
  const treeResizingRef = useRef(false);
  const treeResizeBoundsRef = useRef<DOMRect | null>(null);
  const pendingTreeWidthRef = useRef<number | null>(null);
  const treeResizeFrameRef = useRef<number | null>(null);

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

  const loadPreview = useCallback(async (path: string) => {
    const requestId = ++previewRequestRef.current;
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
  }, [readFile]);

  const selectFile = useCallback((path: string) => {
    selectedPathRef.current = path;
    setSelectedPath(path);
    void loadPreview(path);
  }, [loadPreview]);

  useEffect(() => {
    loadingDirectoriesRef.current.clear();
    previewRequestRef.current += 1;
    selectedPathRef.current = null;
    setDirectories({});
    setFilter("");
    setSelectedPath(null);
    setPreview(null);
    setPreviewLoading(false);
    setPreviewError("");
    setWatchError("");
    const relativeParts = initialFilePath
      ? projectRelativePath(rootPath, initialFilePath).split(/[\\/]/).filter(Boolean)
      : [];
    const parentDirectories = relativeParts.slice(0, -1).reduce<string[]>((paths, part) => {
      paths.push(joinProjectPath(paths[paths.length - 1] ?? rootPath, part));
      return paths;
    }, []);
    setExpanded(new Set([rootPath, ...parentDirectories]));
    void Promise.all([rootPath, ...parentDirectories].map(loadDirectory));
    if (initialFilePath) selectFile(initialFilePath);
  }, [initialFilePath, loadDirectory, rootPath, selectFile]);

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

  function beginTreeResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    treeResizingRef.current = true;
    treeResizeBoundsRef.current = event.currentTarget.parentElement?.getBoundingClientRect() ?? null;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizeTree(event: ReactPointerEvent<HTMLDivElement>) {
    if (!treeResizingRef.current) return;
    const bounds = treeResizeBoundsRef.current;
    if (!bounds) return;
    pendingTreeWidthRef.current = Math.min(520, Math.max(210, event.clientX - bounds.left));
    if (treeResizeFrameRef.current === null) {
      treeResizeFrameRef.current = window.requestAnimationFrame(() => {
        treeResizeFrameRef.current = null;
        const width = pendingTreeWidthRef.current;
        pendingTreeWidthRef.current = null;
        if (width !== null) {
          treeWidthRef.current = width;
          const body = document.querySelector<HTMLElement>(".workspace-explorer-drawer .explorer-body");
          body?.style.setProperty("--explorer-tree-width", `${width}px`);
        }
      });
    }
  }

  function finishTreeResize(event: ReactPointerEvent<HTMLDivElement>) {
    if (treeResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(treeResizeFrameRef.current);
      treeResizeFrameRef.current = null;
    }
    if (pendingTreeWidthRef.current !== null) {
      treeWidthRef.current = pendingTreeWidthRef.current;
      setTreeWidth(pendingTreeWidthRef.current);
      pendingTreeWidthRef.current = null;
    }
    treeResizingRef.current = false;
    treeResizeBoundsRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  useEffect(() => () => {
    if (treeResizeFrameRef.current !== null) window.cancelAnimationFrame(treeResizeFrameRef.current);
  }, []);

  const handleWorkspaceChanged = useCallback((directory: string, changedPaths: string[]) => {
    void loadDirectory(directory);
    const selected = selectedPathRef.current;
    if (selected && pathsAffectFile(changedPaths, selected)) void loadPreview(selected);
  }, [loadDirectory, loadPreview]);

  const handleWatchError = useCallback((error: unknown) => {
    setWatchError(errorMessage(error));
  }, []);

  useWorkspaceDirectoryWatches({
    directories: expanded,
    watchPath,
    onChanged: handleWorkspaceChanged,
    onError: handleWatchError,
  });

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
      const path = joinProjectPath(directory, entry.fileName);
      if (entry.isDirectory) {
        const isExpanded = expanded.has(path);
        return (
          <div key={path}>
            <button className="explorer-tree-row directory" style={{ paddingLeft: 10 + depth * 16 }} onClick={() => toggleDirectory(path)} title={path}>
              <i>{isExpanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</i><span className="tree-folder">{isExpanded ? <FolderOpen aria-hidden="true" /> : <Folder aria-hidden="true" />}</span><span>{entry.fileName}</span>
            </button>
            {isExpanded && renderDirectory(path, depth + 1)}
          </div>
        );
      }
      if (!entry.isFile) return null;
      return (
        <button key={path} className={`explorer-tree-row file ${selectedPath === path ? "selected" : ""}`} style={{ paddingLeft: 30 + depth * 16 }} onClick={() => selectFile(path)} title={path}>
          <span className="tree-file"><File aria-hidden="true" /></span><span>{entry.fileName}</span>
        </button>
      );
    });
  }

  const previewLines = preview?.kind === "text" ? preview.content.split("\n") : [];

  return (
    <div className="workspace-explorer-layer" role="dialog" aria-modal="true" aria-label="项目文件浏览器">
      <section className="workspace-explorer-drawer">
        <header className="explorer-header">
          <div><span className="eyebrow">Project Explorer</span><strong>{projectName(rootPath)}</strong><small>{rootPath}</small>{watchError && <i className="explorer-watch-warning" title={watchError}>自动刷新不可用</i>}</div>
          <div className="explorer-actions" aria-label="项目文件浏览器操作">
            <button className="explorer-size-button" onClick={onToggleMaximize} aria-label={maximized ? "恢复右侧功能区宽度" : "扩大右侧功能区"} title={maximized ? "恢复右侧功能区宽度" : "扩大右侧功能区"}>
              {maximized ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
            </button>
            <button className="explorer-close" onClick={onClose} aria-label="关闭文件浏览器" title="关闭"><X aria-hidden="true" /></button>
          </div>
        </header>
        <div className="explorer-body" style={{ "--explorer-tree-width": `${treeWidth}px` } as CSSProperties}>
          <aside className="explorer-tree-pane">
            <div className="explorer-filter"><Search aria-hidden="true" /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="筛选已展开文件…" /></div>
            <button className="explorer-root" onClick={() => toggleDirectory(rootPath)}><i>{expanded.has(rootPath) ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</i><span><FolderRoot aria-hidden="true" /></span><strong>{projectName(rootPath)}</strong></button>
            <div className="explorer-tree-scroll">{expanded.has(rootPath) && renderDirectory(rootPath, 0)}</div>
          </aside>
          <div className="explorer-resizer" role="separator" aria-label="调整文件树宽度" aria-orientation="vertical" onPointerDown={beginTreeResize} onPointerMove={resizeTree} onPointerUp={finishTreeResize} onPointerCancel={finishTreeResize} />
          <main className="explorer-preview-pane">
            <div className="explorer-preview-bar">
              <span>{selectedPath ? projectRelativePath(rootPath, selectedPath) : "文件预览"}</span>
              {preview && <small>{formatFileSize(preview.byteSize)}</small>}
            </div>
            {!selectedPath && <div className="explorer-empty"><span><File aria-hidden="true" /></span><strong>选择一个文件</strong><p>在左侧展开目录并单击文件，即可在这里预览内容。</p></div>}
            {previewLoading && <div className="explorer-empty"><span className="preview-spinner"><LoaderCircle aria-hidden="true" /></span><strong>正在读取文件…</strong></div>}
            {previewError && <div className="explorer-empty error"><span><FileWarning aria-hidden="true" /></span><strong>无法预览文件</strong><p>{previewError}</p></div>}
            {preview?.kind === "binary" && <div className="explorer-empty"><span><FileCog aria-hidden="true" /></span><strong>二进制文件</strong><p>该文件共 {formatFileSize(preview.byteSize)}，不适合以文本方式显示。</p></div>}
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
