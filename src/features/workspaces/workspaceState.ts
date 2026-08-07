import type { FuzzyFileSearchResult } from "../../generated/app-server/FuzzyFileSearchResult";

const STORAGE_KEY = "codex-shell.workspace.v1";

export function loadWorkspacePath() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveWorkspacePath(path: string | null) {
  try {
    if (path) window.localStorage.setItem(STORAGE_KEY, path);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The app remains usable when browser storage is unavailable.
  }
}

export function workspaceName(path: string | null) {
  if (!path) return "未选择工作区";
  return path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || path;
}

export function joinWorkspacePath(directory: string, name: string) {
  const separator = directory.includes("\\") ? "\\" : "/";
  return `${directory.replace(/[\\/]+$/, "")}${separator}${name.replace(/^[\\/]+/, "")}`;
}

export function workspaceRelativePath(root: string, path: string) {
  const normalizedRoot = root.replace(/[\\/]+$/, "");
  if (path.toLowerCase() === normalizedRoot.toLowerCase()) return workspaceName(root);
  if (path.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}\\`)
    || path.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)) {
    return path.slice(normalizedRoot.length + 1);
  }
  return path;
}

export function activeFileMentionQuery(text: string) {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(text);
  return match ? match[1] : null;
}

export function replaceActiveFileMention(text: string, fileName: string) {
  return text.replace(/(^|\s)@[^\s@]*$/, `$1@${fileName} `);
}

export function resolveFileSearchPath(result: FuzzyFileSearchResult) {
  if (/^(?:[a-zA-Z]:[\\/]|\\\\|\/)/.test(result.path)) return result.path;
  const separator = result.root.includes("\\") ? "\\" : "/";
  return `${result.root.replace(/[\\/]+$/, "")}${separator}${result.path.replace(/^[\\/]+/, "")}`;
}
