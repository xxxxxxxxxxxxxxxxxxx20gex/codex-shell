// @vitest-environment happy-dom
import { openUrl } from "@tauri-apps/plugin-opener";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownContent, markdownLinkTarget } from "./MarkdownContent";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

describe("MarkdownContent links", () => {
  it("renders local image syntax as a file link without loading a browser image", async () => {
    const onOpenPath = vi.fn();
    const view = render(<MarkdownContent onOpenPath={onOpenPath}>{"![沙滩写实人物](/D:/output/image-1.png)"}</MarkdownContent>);
    expect(view.container.querySelector("img")).toBeNull();
    const link = view.getByRole("link", { name: "沙滩写实人物" });
    expect(link.getAttribute("data-local-path")).toBe("D:/output/image-1.png");
    expect(link.querySelector("svg")).toBeTruthy();
    fireEvent.click(link);
    await waitFor(() => expect(onOpenPath).toHaveBeenCalledWith("D:/output/image-1.png"));
  });

  it("keeps linked images and reference images accessible without nested links", () => {
    const view = render(<MarkdownContent>{"[![预览](thumb.png)](full.png)\n\n![参考图片][photo]\n\n[photo]: output/photo.png"}</MarkdownContent>);
    expect(view.container.querySelector("a a, a button, img")).toBeNull();
    expect(view.getByRole("link", { name: "预览" }).getAttribute("href")).toBe("full.png");
    expect(view.getByRole("link", { name: "参考图片" }).getAttribute("href")).toBe("output/photo.png");
  });

  it("opens remote image references only on click and reports local open failures", async () => {
    const onOpenError = vi.fn();
    const view = render(<MarkdownContent onOpenPath={async () => { throw new Error("文件不存在"); }} onOpenError={onOpenError}>{"![网络图片](https://example.test/image.png)\n\n![缺失图片](missing.png)\n\n![危险](javascript:alert)"}</MarkdownContent>);
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.queryByRole("link", { name: "危险" })).toBeNull();
    fireEvent.click(view.getByRole("link", { name: "网络图片" }));
    await waitFor(() => expect(openUrl).toHaveBeenCalledWith("https://example.test/image.png"));
    fireEvent.click(view.getByRole("link", { name: "缺失图片" }));
    await waitFor(() => expect(onOpenError).toHaveBeenCalledWith("文件不存在"));
  });
  it("opens web links with the system opener", async () => {
    const view = render(<MarkdownContent>[OpenAI](https://openai.com/docs)</MarkdownContent>);

    fireEvent.click(view.getByRole("link", { name: "OpenAI" }));

    await waitFor(() => expect(openUrl).toHaveBeenCalledWith("https://openai.com/docs"));
  });

  it("routes Windows and project-relative file links to the local path handler", async () => {
    const onOpenPath = vi.fn();
    const view = render(
      <MarkdownContent onOpenPath={onOpenPath}>
        {["[App](C:/work/src/App.tsx#L12)", "[Readme](docs/README.md)"].join(" ")}
      </MarkdownContent>,
    );

    fireEvent.click(view.getByRole("link", { name: "App" }));
    fireEvent.click(view.getByRole("link", { name: "Readme" }));

    await waitFor(() => expect(onOpenPath).toHaveBeenNthCalledWith(1, "C:/work/src/App.tsx"));
    expect(onOpenPath).toHaveBeenNthCalledWith(2, "docs/README.md");
  });

  it("rejects executable URL schemes and decodes file URLs", () => {
    expect(markdownLinkTarget("/C:/work/final.png")).toEqual({ type: "localPath", value: "C:/work/final.png" });
    expect(markdownLinkTarget("javascript:alert(1)")).toBeNull();
    expect(markdownLinkTarget("file:///C:/work/My%20File.md#L8")).toEqual({
      type: "localPath",
      value: "C:/work/My File.md",
    });
  });

  it("renders unsafe links as non-interactive text", () => {
    const view = render(<MarkdownContent>[unsafe](javascript:alert(1))</MarkdownContent>);

    expect(view.queryByRole("link", { name: "unsafe" })).toBeNull();
    expect(view.getByText("unsafe")).toBeTruthy();
  });
});

describe("MarkdownContent code blocks", () => {
  it("renders fenced code as a labeled, copyable structure", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const view = render(
      <MarkdownContent>{["```python", "print('hello')", "```", "", "```", "plain text", "```"].join("\n")}</MarkdownContent>,
    );

    expect(view.getByText("Python")).toBeTruthy();
    expect(view.getByText("纯文本")).toBeTruthy();
    const copyButtons = view.getAllByRole("button", { name: "复制代码" });
    fireEvent.click(copyButtons[0]);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("print('hello')"));
    expect(view.getByRole("button", { name: "已复制代码" })).toBeTruthy();
  });

  it("keeps inline code inline instead of wrapping it in a block card", () => {
    const view = render(<MarkdownContent>Use `pnpm test` here.</MarkdownContent>);

    expect(view.container.querySelector(".markdown-code-block")).toBeNull();
    expect(view.container.querySelector("code")?.textContent).toBe("pnpm test");
  });
});
