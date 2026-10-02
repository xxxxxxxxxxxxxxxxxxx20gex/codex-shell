// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AttachmentGallery, ImageAttachmentPreview, AttachmentPreviewDialog } from "./AttachmentGallery";
import { ImageAnnotationContext } from "./ImageAnnotationContext";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("./ImageSketchCanvas", () => ({ ImageSketchCanvas: ({ onSave }: { onSave: (dataUrl: string) => void }) => <button onClick={() => onSave("data:image/png;base64,AA==")}>保存草图</button> }));

afterEach(cleanup);

describe("AttachmentGallery", () => {
  it("keeps a hosted image visible without reading its ID as a path or URL", () => {
    const readFile = vi.fn();
    render(<AttachmentGallery files={[]} images={[{ name: "托管附件", fileId: "file-probe" }]} readFile={readFile} />);
    fireEvent.click(screen.getByTitle("预览 托管附件"));
    expect(screen.getByText("此图片暂不支持本地预览")).toBeTruthy();
    expect(screen.queryByLabelText("添加图片批注")).toBeNull();
    expect(readFile).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByLabelText("关闭附件预览")[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it.each(["history", "output", "explorer"])("adds original image and coordinates from %s preview", async (entry) => {
    const apply = vi.fn();
    const image = { name: "screen.png", path: "C:/work/screen.png" };
    const readFile = vi.fn().mockResolvedValue("AA==");
    render(<ImageAnnotationContext.Provider value={apply}>
      {entry === "history" ? <AttachmentGallery files={[]} images={[image]} readFile={readFile} /> : entry === "output" ? <ImageAttachmentPreview {...image} readFile={readFile} /> : <AttachmentPreviewDialog target={{ kind: "image", ...image }} readFile={readFile} onClose={vi.fn()} />}
    </ImageAnnotationContext.Provider>);
    if (entry !== "explorer") fireEvent.click(screen.getByTitle("预览 screen.png"));
    fireEvent.click(await screen.findByLabelText("添加图片批注"));
    const target = screen.getByLabelText("在图片上添加批注（键盘添加到中心）");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect);
    fireEvent.click(target, { detail: 1, clientX: 200, clientY: 250 });
    fireEvent.change(screen.getByPlaceholderText("描述这个位置"), { target: { value: "调整这里" } });
    fireEvent.click(screen.getByText("插入到消息"));
    expect(apply).toHaveBeenCalledWith(image, expect.stringContaining("(x: 25.0%, y: 75.0%) 调整这里"));
  });

  it("does not offer annotations when the local image cannot be read", async () => {
    render(<ImageAnnotationContext.Provider value={vi.fn()}><AttachmentPreviewDialog target={{ kind: "image", name: "missing.png", path: "C:/missing.png" }} readFile={vi.fn().mockRejectedValue(new Error("文件不存在"))} onClose={vi.fn()} /></ImageAnnotationContext.Provider>);
    expect(await screen.findByText("文件不存在")).toBeTruthy();
    expect(screen.queryByLabelText("添加图片批注")).toBeNull();
  });
  it("closes the direct sketch workspace from the outer close action", async () => {
    const onClose = vi.fn();
    render(<ImageAnnotationContext.Provider value={vi.fn()}><AttachmentPreviewDialog sketchMode target={{ kind: "image", name: "草图.png", url: "" }} readFile={vi.fn()} onClose={onClose} /></ImageAnnotationContext.Provider>);
    fireEvent.click(screen.getAllByLabelText("关闭附件预览")[1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("adds a saved sketch as an image without inserting default prompt text", async () => {
    const apply = vi.fn();
    const onClose = vi.fn();
    vi.mocked(invoke).mockResolvedValueOnce("C:/work/sketch.png");
    render(<ImageAnnotationContext.Provider value={apply}><AttachmentPreviewDialog sketchMode target={{ kind: "image", name: "草图.png", url: "data:image/png;base64,AA==" }} readFile={vi.fn()} onClose={onClose} /></ImageAnnotationContext.Provider>);

    fireEvent.click(screen.getByText("保存草图"));

    await waitFor(() => expect(apply).toHaveBeenCalledWith({ name: "草图-草图.png", path: "C:/work/sketch.png" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed sketch save out of the draft", async () => {
    const apply = vi.fn();
    const onClose = vi.fn();
    vi.mocked(invoke).mockRejectedValueOnce(new Error("保存失败"));
    render(<ImageAnnotationContext.Provider value={apply}><AttachmentPreviewDialog sketchMode target={{ kind: "image", name: "草图.png", url: "data:image/png;base64,AA==" }} readFile={vi.fn()} onClose={onClose} /></ImageAnnotationContext.Provider>);

    fireEvent.click(screen.getByText("保存草图"));

    expect(await screen.findByText("保存失败")).toBeTruthy();
    expect(apply).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
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

  it("opens a local resource from the preview header", async () => {
    const onOpenPath = vi.fn().mockResolvedValue(undefined);
    render(
      <AttachmentGallery
        files={[]}
        images={[{ name: "translated.svg", path: "C:\\work\\translated.svg" }]}
        readFile={vi.fn().mockResolvedValue("PHN2Zy8+")}
        onOpenPath={onOpenPath}
      />,
    );

    fireEvent.click(screen.getByTitle("预览 translated.svg"));
    fireEvent.click(screen.getByLabelText("在资源管理器中打开"));
    await waitFor(() => expect(onOpenPath).toHaveBeenCalledWith("C:\\work\\translated.svg"));
  });
});
