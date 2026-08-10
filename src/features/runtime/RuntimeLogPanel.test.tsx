import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { RuntimeLogPanel } from "./RuntimeLogPanel";

describe("RuntimeLogPanel", () => {
  it("renders bounded-log context and severity", () => {
    const markup = renderToStaticMarkup(
      <RuntimeLogPanel
        entries={[{ id: 1, receivedAt: 1_786_334_400_000, line: "WARN gateway retry" }]}
        onClear={vi.fn()}
      />,
    );

    expect(markup).toContain("最近 1/200 条");
    expect(markup).toContain('data-level="warning"');
    expect(markup).toContain("敏感本地数据");
    expect(markup).toContain("WARN gateway retry");
  });
});
