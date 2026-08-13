// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("closes on outside pointer and Escape", () => {
    render(<><AttachmentMenu onSelectPaths={vi.fn()} onError={vi.fn()} /><button type="button">外部</button></>);
    const trigger = screen.getByRole("button", { name: "添加附件" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "外部" }));
    expect(screen.queryByRole("menu")).toBeNull();

    act(() => trigger.focus());
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
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
