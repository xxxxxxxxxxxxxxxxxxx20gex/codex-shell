import { describe, expect, it } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import {
  buildThreadNumbers,
  formatThreadNumber,
  threadReference,
  threadReferenceKind,
  threadTitle,
} from "./threadPresentation";

function thread(id: string, overrides: Partial<Thread> = {}) {
  return {
    id,
    name: null,
    preview: `会话 ${id}`,
    path: null,
    ...overrides,
  } as Thread;
}

describe("thread presentation", () => {
  it("numbers the displayed list without replacing real thread ids", () => {
    const threads = [thread("thread-c"), thread("thread-b"), thread("thread-a")];
    const numbers = buildThreadNumbers(threads);

    expect([...numbers.entries()]).toEqual([
      ["thread-c", 1],
      ["thread-b", 2],
      ["thread-a", 3],
    ]);
    expect(formatThreadNumber(numbers.get("thread-b")!)).toBe("#02");
  });

  it("renumbers remaining sessions after deletion", () => {
    const threads = [thread("thread-c"), thread("thread-b"), thread("thread-a")];
    const remaining = threads.filter((item) => item.id !== "thread-b");

    expect([...buildThreadNumbers(remaining).entries()]).toEqual([
      ["thread-c", 1],
      ["thread-a", 2],
    ]);
  });

  it("uses the rollout path as the AI-readable reference and falls back to the id", () => {
    const withPath = thread("thread-path", { path: "C:\\sessions\\rollout.jsonl" });
    const withoutPath = thread("thread-id");

    expect([threadReference(withPath), threadReferenceKind(withPath)]).toEqual(["C:\\sessions\\rollout.jsonl", "路径"]);
    expect([threadReference(withoutPath), threadReferenceKind(withoutPath)]).toEqual(["thread-id", "ID"]);
  });

  it("prefers an explicit session name and falls back to its preview", () => {
    expect(threadTitle(thread("named", { name: "  项目规划  " }))).toBe("项目规划");
    expect(threadTitle(thread("preview", { preview: "历史问题" }))).toBe("历史问题");
  });
});
