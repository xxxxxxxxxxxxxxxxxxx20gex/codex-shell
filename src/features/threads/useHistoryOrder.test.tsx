// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { PINNED_THREAD_SECTION_ID } from "./threadPresentation";
import { useHistoryOrder } from "./useHistoryOrder";

const thread = (id: string, pinned = false) => ({ id, section: pinned ? { id: PINNED_THREAD_SECTION_ID } : null } as Thread);
const ids = (threads: Thread[]) => threads.map((item) => item.id);
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); vi.restoreAllMocks(); });

describe("history display order", () => {
  it("persists moves across refresh, recency changes and remount, keeping new entries and pagination in normal slots", () => {
    const { result, rerender, unmount } = renderHook(({ threads }) => useHistoryOrder(threads, "C:\\CS", false), { initialProps: { threads: [thread("a"), thread("b"), thread("c")] } });
    act(() => result.current.move("c", "a", false));
    expect(ids(result.current.ordered)).toEqual(["c", "a", "b"]);
    rerender({ threads: [thread("new"), thread("b"), thread("c"), thread("a"), thread("older")] });
    expect(ids(result.current.ordered)).toEqual(["new", "c", "a", "b", "older"]);
    unmount();
    const next = renderHook(() => useHistoryOrder([thread("a"), thread("b"), thread("c")], "c:/cs", false));
    expect(ids(next.result.current.ordered)).toEqual(["c", "a", "b"]);
  });

  it("keeps unloaded and archived IDs while reordering a partial page", () => {
    const { result, rerender } = renderHook(({ threads, archived }) => useHistoryOrder(threads, "cs", archived), { initialProps: { threads: [thread("a"), thread("b"), thread("c"), thread("d")], archived: false } });
    act(() => result.current.move("b", "a", false));
    rerender({ threads: [thread("c"), thread("d")], archived: false });
    act(() => result.current.move("d", "c", false));
    rerender({ threads: [thread("a"), thread("b"), thread("c"), thread("d")], archived: false });
    expect(ids(result.current.ordered)).toEqual(["b", "a", "d", "c"]);
    rerender({ threads: [thread("a"), thread("b")], archived: true });
    act(() => result.current.move("a", "b", true));
    expect(ids(result.current.ordered)).toEqual(["a", "b"]);
    rerender({ threads: [thread("a"), thread("b")], archived: false });
    expect(ids(result.current.ordered)).toEqual(["b", "a"]);
  });

  it("preserves pin boundaries, ignores missing/self targets and allows individual fork ordering", () => {
    const parent = thread("parent");
    const child = { ...thread("child"), forkedFromId: "parent" };
    const { result } = renderHook(() => useHistoryOrder([parent, child, thread("pin", true)], "cs", false));
    act(() => { result.current.move("parent", "pin", false); result.current.move("missing", "child", false); result.current.move("child", "child", false); });
    expect(result.current.customized).toBe(false);
    act(() => result.current.move("child", "parent", false));
    expect(ids(result.current.ordered)).toEqual(["pin", "child", "parent"]);
    act(() => result.current.reset());
    expect(ids(result.current.ordered)).toEqual(["pin", "parent", "child"]);
  });

  it("isolates homes and does not apply failed storage writes", () => {
    const { result, rerender } = renderHook(({ scope }) => useHistoryOrder([thread("a"), thread("b")], scope, false), { initialProps: { scope: "one" } });
    act(() => result.current.move("b", "a", false));
    rerender({ scope: "two" });
    expect(ids(result.current.ordered)).toEqual(["a", "b"]);
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("quota"); } });
    act(() => result.current.move("b", "a", false));
    expect(result.current.error).toContain("无法保存");
    expect(ids(result.current.ordered)).toEqual(["a", "b"]);
  });

  it("recovers malformed storage and rejects growth beyond the bounded index", () => {
    localStorage.setItem("codex-shell.history-order:cs", "{");
    const first = renderHook(() => useHistoryOrder([thread("a"), thread("b")], "cs", false));
    expect(first.result.current.customized).toBe(false);
    first.unmount();
    localStorage.setItem("codex-shell.history-order:cs", JSON.stringify(Array.from({ length: 10_000 }, (_, i) => `old-${i}`)));
    const next = renderHook(() => useHistoryOrder([thread("a"), thread("b")], "cs", false));
    act(() => next.result.current.move("b", "a", false));
    expect(next.result.current.error).toContain("上限");
    expect(ids(next.result.current.ordered)).toEqual(["a", "b"]);
  });
});
