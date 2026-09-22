import { describe, expect, it } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import {
  orderThreadsByBranch,
  PINNED_THREAD_SECTION_ID,
  threadBranchDepth,
  threadReference,
  threadReferenceKind,
  threadTitle,
  threadFullTitle,
  normalizeThreadPath,
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
  it("cleans Markdown previews without removing code names or link labels", () => {
    const value = thread("markdown", { preview: "# 修复 **登录**\n\n- 检查 `foo_bar()` 与 [文档](https://example.com)\n- ![界面截图](test.png)" });
    expect(threadFullTitle(value)).toBe("修复 登录 检查 foo_bar() 与 文档 界面截图");
    expect(threadFullTitle(thread("empty", { preview: "---\n\n<!-- empty -->" }))).toBe("未命名会话");
  });

  it("keeps the full name intact and truncates only display text at grapheme boundaries", () => {
    const name = "👨‍👩‍👧‍👦".repeat(61);
    const value = thread("long", { name });
    expect(threadTitle(value)).toBe("👨‍👩‍👧‍👦".repeat(59) + "…");
    expect(threadFullTitle(value)).toBe(name);
    expect(value.name).toBe(name);
    expect(threadTitle(thread("explicit", { name: "**literal**\n foo_bar", preview: "ignored" }))).toBe("**literal** foo_bar");
  });
  it("uses the rollout path as the AI-readable reference and falls back to the id", () => {
    const withPath = thread("thread-path", { path: "C:\\sessions\\rollout.jsonl" });
    const withoutPath = thread("thread-id");

    expect([threadReference(withPath), threadReferenceKind(withPath)]).toEqual(["C:\\sessions\\rollout.jsonl", "路径"]);
    expect([threadReference(withoutPath), threadReferenceKind(withoutPath)]).toEqual(["thread-id", "ID"]);
  });

  it("normalizes extended Windows rollout paths before displaying or copying them", () => {
    expect(normalizeThreadPath('"\\\\?\\C:\\sessions\\rollout.jsonl"')).toBe("C:\\sessions\\rollout.jsonl");
    expect(threadReference(thread("extended", { path: "\\\\?\\C:\\sessions\\rollout.jsonl" }))).toBe("C:\\sessions\\rollout.jsonl");
    expect(normalizeThreadPath("C:\\sessions\\rollout.jsonl")).toBe("C:\\sessions\\rollout.jsonl");
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
