// @vitest-environment happy-dom
import { openUrl } from "@tauri-apps/plugin-opener";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownContent, markdownLinkTarget } from "./MarkdownContent";

vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

describe("MarkdownContent links", () => {
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
