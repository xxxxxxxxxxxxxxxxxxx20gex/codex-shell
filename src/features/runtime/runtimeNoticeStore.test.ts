import { describe, expect, it, vi } from "vitest";
import { RuntimeNoticeStore } from "./runtimeNoticeStore";

describe("RuntimeNoticeStore", () => {
  it("deduplicates repeated warnings and refreshes their recency", () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(10).mockReturnValueOnce(20);
    const store = new RuntimeNoticeStore();
    const notice = { kind: "warning" as const, title: "配置警告", message: "bad config" };

    store.push(notice);
    store.push(notice);

    expect(store.getSnapshot()).toEqual([{ ...notice, id: 1, receivedAt: 20 }]);
    vi.restoreAllMocks();
  });

  it("keeps a bounded list and supports dismissal", () => {
    const store = new RuntimeNoticeStore();
    for (let index = 0; index < 55; index += 1) {
      store.push({ kind: "info", title: `notice-${index}`, message: "message" });
    }
    expect(store.getSnapshot()).toHaveLength(50);
    const firstId = store.getSnapshot()[0].id;
    store.dismiss(firstId);
    expect(store.getSnapshot()).toHaveLength(49);
  });

  it("bounds individual server-provided fields", () => {
    const store = new RuntimeNoticeStore();
    store.push({
      kind: "warning",
      title: "t".repeat(300),
      message: "m".repeat(5_000),
      path: "p".repeat(1_500),
    });

    expect(store.getSnapshot()[0]).toMatchObject({
      title: `${"t".repeat(200)}…`,
      message: `${"m".repeat(4_000)}…`,
      path: `${"p".repeat(1_000)}…`,
    });
  });
});
