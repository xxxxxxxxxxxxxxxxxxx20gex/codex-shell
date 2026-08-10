import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodexHomeCard } from "./CodexHomeCard";

describe("CodexHomeCard", () => {
  it("shows the active isolated directory and both configuration actions", () => {
    const markup = renderToStaticMarkup(
      <CodexHomeCard path="C:\Users\example\.codex-shell" disabled={false} onRestart={async () => undefined} />,
    );

    expect(markup).toContain("C:\\Users\\example\\.codex-shell");
    expect(markup).toContain("选择目录");
    expect(markup).toContain("恢复默认");
    expect(markup).toContain("~/.codex-shell");
  });

  it("disables directory switching while a conversation is running", () => {
    const markup = renderToStaticMarkup(
      <CodexHomeCard path="C:\Users\example\.codex-shell" disabled onRestart={async () => undefined} />,
    );

    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain("请等待所有对话执行完成后再切换目录");
  });
});
