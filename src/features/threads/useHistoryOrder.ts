import { useMemo, useState } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { isThreadPinned, orderThreadsByBranch } from "./threadPresentation";

const LIMIT = 10_000;

function readOrder(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 128))].slice(0, LIMIT)
      : [];
  } catch {
    return [];
  }
}

/** Presentation only: Core cannot order unsectioned threads without changing their section. */
export function useHistoryOrder(threads: Thread[], scope: string, archived: boolean) {
  const key = `codex-shell.history-order:${scope.replace(/\\/g, "/").toLowerCase()}`;
  const [saved, setSaved] = useState(() => ({ key, ids: readOrder(key) }));
  const [error, setError] = useState("");
  if (saved.key !== key) setSaved({ key, ids: readOrder(key) });
  const ordered = useMemo(() => {
    const baseline = orderThreadsByBranch(threads);
    if (archived || saved.key !== key) return baseline;
    const rank = new Map(saved.ids.map((id, index) => [id, index]));
    // Unknown entries keep their normal slots: new sessions stay at the top,
    // while older pages do not jump ahead of the already loaded history.
    return [true, false].flatMap((pinned) => {
      const group = baseline.filter((thread) => isThreadPinned(thread) === pinned);
      const known = group.filter((thread) => rank.has(thread.id))
        .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
      let index = 0;
      return group.map((thread) => rank.has(thread.id) ? known[index++] : thread);
    });
  }, [threads, archived, saved, key]);

  function move(sourceId: string, targetId: string, after: boolean) {
    if (archived || sourceId === targetId) return;
    const source = ordered.find((thread) => thread.id === sourceId);
    const target = ordered.find((thread) => thread.id === targetId);
    if (!source || !target || isThreadPinned(source) !== isThreadPinned(target)) return;
    const ids = ordered.map((thread) => thread.id).filter((id) => id !== sourceId);
    ids.splice(ids.indexOf(targetId) + Number(after), 0, sourceId);
    const visible = new Set(ids);
    const merged = [...saved.ids];
    const known = new Set(merged);
    for (let index = 0; index < ids.length; index++) {
      const id = ids[index];
      if (known.has(id)) continue;
      const following = ids.slice(index + 1).find((candidate) => known.has(candidate));
      merged.splice(following ? merged.indexOf(following) : merged.length, 0, id);
      known.add(id);
    }
    let index = 0;
    const next = merged.map((id) => visible.has(id) ? ids[index++] : id);
    if (next.length > LIMIT) {
      setError("保存的排序已达上限，请重置排序后再试。");
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSaved({ key, ids: next });
      setError("");
    } catch {
      setError("无法保存会话顺序，请检查本地存储空间后重试。");
    }
  }

  function reset() {
    try {
      localStorage.removeItem(key);
      setSaved({ key, ids: [] });
      setError("");
    } catch {
      setError("无法重置会话顺序，请检查本地存储权限。");
    }
  }

  return { ordered, move, reset, error, customized: saved.ids.length > 0 };
}
