import type { FuzzyFileSearchResult } from "../../generated/app-server/FuzzyFileSearchResult";

/** The product-owned fallback project directory used for new threads. */
export interface DefaultProjectDirectory {
  rootPath: string;
  path: string;
}

export function projectName(path: string | null) {
  if (!path) return "未选择项目";
  return path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || path;
}

export function isDefaultProjectPath(path: string, rootPath: string) {
  const normalizedPath = path.replace(/[\\/]+$/, "");
  const normalizedRoot = rootPath.replace(/[\\/]+$/, "");
  if (normalizedPath.toLowerCase() === normalizedRoot.toLowerCase()) return true;
  return normalizedPath.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}\\`)
    || normalizedPath.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`);
}

export function joinProjectPath(directory: string, name: string) {
  const separator = directory.includes("\\") ? "\\" : "/";
  return `${directory.replace(/[\\/]+$/, "")}${separator}${name.replace(/^[\\/]+/, "")}`;
}

export function resolveProjectRelativePath(root: string, relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:\//.test(normalized)) return null;
  const parts = normalized.split("/").filter((part) => part && part !== ".");
  if (parts.length === 0 || parts.some((part) => part === "..")) return null;
  return parts.reduce(joinProjectPath, root);
}

function isAbsoluteLocalPath(path: string) {
  return /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(path);
}

function hasParentTraversal(path: string) {
  return path.split(/[\\/]/).some((part) => part === "..");
}

export function isPathWithinRoot(root: string, path: string) {
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  const normalizedPath = path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

export function resolveLinkedProjectPath(root: string, path: string) {
  if (isAbsoluteLocalPath(path)) return hasParentTraversal(path) ? null : path;
  return resolveProjectRelativePath(root, path);
}

export function projectRelativePath(root: string, path: string) {
  const normalizedRoot = root.replace(/[\\/]+$/, "");
  if (path.toLowerCase() === normalizedRoot.toLowerCase()) return projectName(root);
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
