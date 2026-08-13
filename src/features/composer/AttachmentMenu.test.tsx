// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { open } from "@tauri-apps/plugin-dialog";
import { AttachmentMenu } from "./AttachmentMenu";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

afterEach(cleanup);

describe("AttachmentMenu", () => {
  it("offers image and file pickers from the plus menu", () => {
    render(<AttachmentMenu onSelectImages={vi.fn()} onSelectFiles={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "添加附件" }));
    expect(screen.getByRole("menuitem", { name: /添加图片/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /添加文件/ })).toBeTruthy();
  });

  it("routes selected image paths to the image callback", async () => {
    vi.mocked(open).mockResolvedValue(["C:\\work\\screen.png"]);
    const onSelectImages = vi.fn();
    render(<AttachmentMenu onSelectImages={onSelectImages} onSelectFiles={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "添加附件" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /添加图片/ }));
    await vi.waitFor(() => expect(onSelectImages).toHaveBeenCalledWith(["C:\\work\\screen.png"]));
  });
});
