// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { open } from "@tauri-apps/plugin-dialog";
import { AttachmentMenu } from "./AttachmentMenu";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

afterEach(cleanup);

describe("AttachmentMenu", () => {
  it("offers one Codex-style files and folders action from the plus menu", () => {
    render(<AttachmentMenu onSelectPaths={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "添加附件" }));
    expect(screen.getByRole("menuitem", { name: /添加文件和文件夹/ })).toBeTruthy();
    expect(screen.queryAllByRole("menuitem")).toHaveLength(1);
  });

  it("routes every selected path through the unified callback", async () => {
    vi.mocked(open).mockResolvedValue(["C:\\work\\screen.png"]);
    const onSelectPaths = vi.fn();
    render(<AttachmentMenu onSelectPaths={onSelectPaths} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "添加附件" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /添加文件和文件夹/ }));
    await vi.waitFor(() => expect(onSelectPaths).toHaveBeenCalledWith(["C:\\work\\screen.png"]));
    expect(open).toHaveBeenCalledWith({ multiple: true, directory: false, title: "添加文件和文件夹" });
  });
});
