import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendRuntimeLogs,
  normalizeRuntimeLogLine,
  RuntimeLogStore,
  type RuntimeLogEntry,
} from "./runtimeLogStore";

function entry(id: number): RuntimeLogEntry {
  return { id, receivedAt: id, line: `line-${id}` };
}

afterEach(() => vi.useRealTimers());

describe("runtime log buffer", () => {
  it("strips terminal formatting and caps oversized lines", () => {
    expect(normalizeRuntimeLogLine("\u001b[31merror\u001b[0m")).toBe("error");
    const oversized = normalizeRuntimeLogLine("x".repeat(4_100));
    expect(oversized).toHaveLength(4_008);
    expect(oversized).toMatch(/（该行已截断）$/);
  });

  it("keeps only the newest 200 entries", () => {
    const entries = Array.from({ length: 205 }, (_, id) => entry(id));

    expect(appendRuntimeLogs([], entries)).toEqual(entries.slice(5));
    expect(appendRuntimeLogs(entries.slice(0, 199), [entry(205), entry(206)]))
      .toEqual([...entries.slice(1, 199), entry(205), entry(206)]);
  });

  it("batches updates without requiring a React owner to rerender", () => {
    vi.useFakeTimers();
    const store = new RuntimeLogStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.enqueue("INFO first");
    store.enqueue("WARN second");
    expect(store.getSnapshot()).toEqual([]);

    vi.advanceTimersByTime(150);
    expect(store.getSnapshot().map((item) => item.line)).toEqual(["INFO first", "WARN second"]);
    expect(listener).toHaveBeenCalledTimes(1);
    store.dispose();
  });

  it("cancels pending publication when logs are cleared or disposed", () => {
    vi.useFakeTimers();
    const clearedStore = new RuntimeLogStore();
    const clearedListener = vi.fn();
    clearedStore.subscribe(clearedListener);
    clearedStore.enqueue("pending clear");
    clearedStore.clear();

    const disposedStore = new RuntimeLogStore();
    const disposedListener = vi.fn();
    disposedStore.subscribe(disposedListener);
    disposedStore.enqueue("pending dispose");
    disposedStore.dispose();

    vi.advanceTimersByTime(150);
    expect(clearedStore.getSnapshot()).toEqual([]);
    expect(clearedListener).not.toHaveBeenCalled();
    expect(disposedStore.getSnapshot()).toEqual([]);
    expect(disposedListener).not.toHaveBeenCalled();
    clearedStore.dispose();
  });

  it("stops notifying an unsubscribed listener", () => {
    vi.useFakeTimers();
    const store = new RuntimeLogStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.enqueue("after unsubscribe");
    vi.advanceTimersByTime(150);

    expect(store.getSnapshot()).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
    store.dispose();
  });

  it("publishes one change when visible logs are cleared", () => {
    vi.useFakeTimers();
    const store = new RuntimeLogStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.enqueue("visible");
    vi.advanceTimersByTime(150);
    listener.mockClear();

    store.clear();
    store.clear();

    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
    store.dispose();
  });
});
