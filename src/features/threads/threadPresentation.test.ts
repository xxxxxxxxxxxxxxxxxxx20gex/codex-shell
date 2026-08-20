import { describe, expect, it } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import {
  orderThreadsByBranch,
  PINNED_THREAD_SECTION_ID,
  threadBranchDepth,
  threadReference,
  threadReferenceKind,
  threadTitle,
} from "./threadPresentation";

function thread(id: string, overrides: Partial<Thread> = {}) {
  return {
    id,
    path: null,
    name: null,
    preview: `会话 ${id}`,
    ...overrides,
  } as Thread;
}

describe("thread presentation", () => {
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

  it("places forked sessions below their parent and calculates depth", () => {
    const threads = [thread("child", { forkedFromId: "root" }), thread("other"), thread("root")];

    expect(orderThreadsByBranch(threads).map((item) => item.id)).toEqual(["other", "root", "child"]);
    expect(threadBranchDepth(threads[0], threads)).toBe(1);
  });

  it("keeps a fork visible as a root when its parent is not listed", () => {
    const orphan = thread("orphan", { forkedFromId: "missing-parent" });

    expect(orderThreadsByBranch([orphan]).map((item) => item.id)).toEqual(["orphan"]);
    expect(threadBranchDepth(orphan, [orphan])).toBe(0);
  });

  it("moves pinned sessions to the top while preserving relative order", () => {
    const threads = [
      thread("recent"),
      thread("pinned-older", { section: { id: PINNED_THREAD_SECTION_ID, name: "Pinned", appearance: null } }),
      thread("older"),
      thread("pinned-oldest", { section: { id: PINNED_THREAD_SECTION_ID, name: "Pinned", appearance: null } }),
    ];

    expect(orderThreadsByBranch(threads).map((item) => item.id)).toEqual([
      "pinned-older",
      "pinned-oldest",
      "recent",
      "older",
    ]);
  });
});
