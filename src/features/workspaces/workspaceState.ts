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

/** Resolve a display-only link for clipboard use without changing workspace access rules. */
export function resolveAbsoluteLinkedPath(root: string, path: string) {
  const candidate = isAbsoluteLocalPath(path)
    ? path
    : `${root.replace(/[\\/]+$/, "")}/${path}`;
  const normalized = candidate.replace(/\\/g, "/");
  const drive = /^([a-zA-Z]:)\/(.*)$/.exec(normalized);
  const unc = /^\/\/([^/]+)\/([^/]+)(?:\/(.*))?$/.exec(normalized);
  if (!drive && !unc) return null;
  const segments = (drive ? drive[2] : unc?.[3] ?? "").split("/");
  const resolved: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (resolved.length === 0) return null;
      resolved.pop();
    } else {
      resolved.push(segment);
    }
  }
  if (drive) {
    const separator = candidate.includes("\\") ? "\\" : "/";
    return `${drive[1]}${separator}${resolved.join(separator)}`;
  }
  return `\\\\${unc![1]}\\${unc![2]}${resolved.length ? `\\${resolved.join("\\")}` : ""}`;
}

export function projectRelativePath(root: string, path: string) {
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedPath = path.replace(/\\/g, "/");
  if (normalizedPath.toLowerCase() === normalizedRoot.toLowerCase()) return projectName(root);
  if (normalizedPath.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)) {
    const relative = normalizedPath.slice(normalizedRoot.length + 1);
    return root.includes("\\") ? relative.replace(/\//g, "\\") : relative;
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
