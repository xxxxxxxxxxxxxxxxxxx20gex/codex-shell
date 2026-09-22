/// <reference lib="es2022.intl" />
import type { Thread } from "../../generated/app-server/v2/Thread";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

const titleParser = unified().use(remarkParse).use(remarkGfm);

export function threadFullTitle(thread: Thread) {
  if (thread.name?.trim()) return thread.name.trim();
  const tree = titleParser.parse(thread.preview);
  function plain(node: { type: string; value?: string; alt?: string | null; children?: readonly Parameters<typeof plain>[0][] }): string {
    if (node.type === "html" || node.type === "definition") return "";
    if (node.type === "image" || node.type === "imageReference") return node.alt || "";
    if (node.type === "break") return " ";
    if (node.value !== undefined) return node.value;
    const separator = ["root", "list", "listItem", "blockquote", "table", "tableRow", "footnoteDefinition"].includes(node.type) ? " " : "";
    return node.children?.map(plain).join(separator) || "";
  }
  return plain(tree).replace(/\s+/g, " ").trim() || "未命名会话";
}

export const PINNED_THREAD_SECTION_ID = "01984de2-8f74-7c91-a3b2-5c5e937cf318";

export function isThreadPinned(thread: Thread) {
  return thread.section?.id === PINNED_THREAD_SECTION_ID;
}

export function threadTitle(thread: Thread) {
  const title = threadFullTitle(thread).replace(/\s+/g, " ");
  const characters = Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(title), (part) => part.segment);
  return characters.length <= 60 ? title : `${characters.slice(0, 59).join("").trimEnd()}…`;
}

/** Put pinned sessions first, then keep the remaining fork branches in server recency order. */
export function orderThreadsByBranch(threads: Thread[]): Thread[] {
  const byId = new Map(threads.map((thread) => [thread.id, thread]));
  const children = new Map<string, Thread[]>();
  const roots: Thread[] = [];

  for (const thread of threads) {
    const parentId = thread.forkedFromId;
    if (parentId && byId.has(parentId)) {
      const siblings = children.get(parentId) ?? [];
      siblings.push(thread);
      children.set(parentId, siblings);
    } else {
      roots.push(thread);
    }
  }

  const ordered: Thread[] = [];
  const visited = new Set<string>();
  const append = (thread: Thread) => {
    if (visited.has(thread.id)) return;
    visited.add(thread.id);
    ordered.push(thread);
    for (const child of children.get(thread.id) ?? []) append(child);
  };
  roots.forEach(append);
  threads.forEach(append);
  return [
    ...ordered.filter(isThreadPinned),
    ...ordered.filter((thread) => !isThreadPinned(thread)),
  ];
}

export function threadBranchDepth(thread: Thread, threads: Thread[]): number {
  const byId = new Map(threads.map((item) => [item.id, item]));
  const visited = new Set<string>();
  let depth = 0;
  let parentId = thread.forkedFromId;
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.forkedFromId;
  }
  return depth;
}

export function threadReference(thread: Thread) {
  return normalizeThreadPath(thread.path) || thread.id;
}

export function threadReferenceKind(thread: Thread) {
  return normalizeThreadPath(thread.path) ? "路径" : "ID";
}

/** Return a user-facing Windows path instead of the Win32 extended-path form. */
export function normalizeThreadPath(path: string | null | undefined) {
  const trimmed = path?.trim() ?? "";
  const unquoted = trimmed.length >= 2 && unquotedPair(trimmed)
    ? trimmed.slice(1, -1)
    : trimmed;
  return unquoted.startsWith("\\\\?\\") ? unquoted.slice(4) : unquoted;
}

function unquotedPair(value: string) {
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'");
}
