import type { Thread } from "../../generated/app-server/v2/Thread";

export function threadTitle(thread: Thread) {
  return thread.name?.trim() || thread.preview.trim() || "未命名会话";
}

export function buildThreadNumbers(threads: Thread[]): ReadonlyMap<string, number> {
  const numbers = new Map<string, number>();
  threads.forEach((thread, index) => {
    if (!numbers.has(thread.id)) numbers.set(thread.id, index + 1);
  });
  return numbers;
}

export function formatThreadNumber(number: number) {
  return `#${String(number).padStart(2, "0")}`;
}

export function threadReference(thread: Thread) {
  return thread.path?.trim() || thread.id;
}

export function threadReferenceKind(thread: Thread) {
  return thread.path?.trim() ? "路径" : "ID";
}
