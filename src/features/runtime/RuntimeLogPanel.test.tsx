import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeLogPanel } from "./RuntimeLogPanel";
import { RuntimeLogStore } from "./runtimeLogStore";

afterEach(() => vi.useRealTimers());

describe("RuntimeLogPanel", () => {
  it("renders bounded-log context and severity", () => {
    vi.useFakeTimers();
    const store = new RuntimeLogStore();
    store.enqueue("WARN gateway retry");
    vi.advanceTimersByTime(150);
    const markup = renderToStaticMarkup(
      <RuntimeLogPanel store={store} />,
    );

    expect(markup).toContain("最近 1/200 条");
    expect(markup).toContain('data-level="warning"');
    expect(markup).toContain("敏感本地数据");
    expect(markup).toContain("WARN gateway retry");
    store.dispose();
  });
});
