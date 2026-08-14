// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { open } from "@tauri-apps/plugin-dialog";
import { ComposerAddMenu } from "./ComposerAddMenu";

vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

afterEach(cleanup);

function renderMenu(overrides: Partial<ComponentProps<typeof ComposerAddMenu>> = {}) {
  const props: ComponentProps<typeof ComposerAddMenu> = {
    hasThread: true,
    running: false,
    onSelectPaths: vi.fn(),
    onCommand: vi.fn(),
    onError: vi.fn(),
    onOpen: vi.fn(),
    ...overrides,
  };
  return { ...render(<ComposerAddMenu {...props} />), props };
}

describe("ComposerAddMenu", () => {
  it("combines file attachment and slash-command capabilities in the plus menu", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "添加与命令" }));
    expect(screen.getByRole("menuitem", { name: /添加文件和文件夹/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Skills/ })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /压缩上下文/ })).toBeTruthy();
    expect(screen.getAllByRole("menuitem")).toHaveLength(7);
  });

  it("runs a command from the plus menu and closes it", () => {
    const onCommand = vi.fn();
    renderMenu({ onCommand });
    fireEvent.click(screen.getByRole("button", { name: "添加与命令" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Skills/ }));
    expect(onCommand).toHaveBeenCalledWith("skills");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("keeps thread-dependent commands disabled until a thread exists", () => {
    renderMenu({ hasThread: false });
    fireEvent.click(screen.getByRole("button", { name: "添加与命令" }));
    expect((screen.getByRole("menuitem", { name: /压缩上下文/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("menuitem", { name: /Skills/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("closes on outside pointer and Escape", () => {
    render(<><ComposerAddMenu hasThread running={false} onSelectPaths={vi.fn()} onCommand={vi.fn()} onError={vi.fn()} onOpen={vi.fn()} /><button type="button">外部</button></>);
    const trigger = screen.getByRole("button", { name: "添加与命令" });
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
    renderMenu({ onSelectPaths });
    fireEvent.click(screen.getByRole("button", { name: "添加与命令" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /添加文件和文件夹/ }));
    await vi.waitFor(() => expect(onSelectPaths).toHaveBeenCalledWith(["C:\\work\\screen.png"]));
    expect(open).toHaveBeenCalledWith({ multiple: true, directory: false, title: "添加文件和文件夹" });
  });
});
