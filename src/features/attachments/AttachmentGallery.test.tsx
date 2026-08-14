// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentGallery } from "./AttachmentGallery";

afterEach(cleanup);

describe("AttachmentGallery", () => {
  it("shows file cards and previews text through the app-server file reader", async () => {
    const readFile = vi.fn().mockResolvedValue(btoa("hello from file"));
    const onRemoveFile = vi.fn();
    render(
      <AttachmentGallery
        files={[{ name: "README.md", path: "C:\\work\\README.md" }]}
        images={[]}
        readFile={readFile}
        onRemoveFile={onRemoveFile}
      />,
    );

    fireEvent.click(screen.getByTitle("C:\\work\\README.md"));
    expect(await screen.findByText("hello from file")).toBeTruthy();
    expect(readFile).toHaveBeenCalledWith("C:\\work\\README.md");

    fireEvent.click(screen.getByLabelText("移除 README.md"));
    expect(onRemoveFile).toHaveBeenCalledWith("C:\\work\\README.md");
  });

  it("shows a data URL thumbnail and opens the image preview", () => {
    const source = "data:image/png;base64,AA==";
    render(
      <AttachmentGallery
        files={[]}
        images={[{ name: "粘贴图片 1", url: source }]}
        readFile={vi.fn()}
      />,
    );

    expect(screen.getByAltText("粘贴图片 1").getAttribute("src")).toBe(source);
    fireEvent.click(screen.getByTitle("预览 粘贴图片 1"));
    expect(screen.getByRole("dialog", { name: "预览 粘贴图片 1" })).toBeTruthy();
    expect(screen.getAllByAltText("粘贴图片 1")).toHaveLength(2);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "预览 粘贴图片 1" })).toBeNull();
  });

  it("loads a local image for its thumbnail and preview", async () => {
    const readFile = vi.fn().mockResolvedValue("AA==");
    render(
      <AttachmentGallery
        files={[]}
        images={[{ name: "screen.png", path: "C:\\work\\screen.png" }]}
        readFile={readFile}
      />,
    );

    await waitFor(() => expect(screen.getByAltText("screen.png").getAttribute("src")).toBe("data:image/png;base64,AA=="));
    fireEvent.click(screen.getByTitle("预览 screen.png"));
    await waitFor(() => expect(screen.getAllByAltText("screen.png")).toHaveLength(2));
  });
});
