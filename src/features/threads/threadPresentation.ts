import type { Thread } from "../../generated/app-server/v2/Thread";

export function threadTitle(thread: Thread) {
  return thread.name?.trim() || thread.preview.trim() || "未命名会话";
}

/** Keep forked sessions next to their source session while preserving server recency order. */
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
  return ordered;
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
  return thread.path?.trim() || thread.id;
}

export function threadReferenceKind(thread: Thread) {
  return thread.path?.trim() ? "路径" : "ID";
}
