// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WindowTitleBar } from "./WindowTitleBar";

const appWindow = vi.hoisted(() => ({
  close: vi.fn(async () => undefined),
  isMaximized: vi.fn(async () => false),
  minimize: vi.fn(async () => undefined),
  onResized: vi.fn(async () => () => undefined),
  toggleMaximize: vi.fn(async () => undefined),
}));

vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => appWindow }));

beforeEach(() => {
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
  Object.values(appWindow).forEach((mock) => mock.mockClear());
  appWindow.isMaximized.mockResolvedValue(false);
  appWindow.onResized.mockResolvedValue(() => undefined);
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});

describe("WindowTitleBar", () => {
  it("keeps all native window actions on the frameless shell", async () => {
    render(<WindowTitleBar />);

    fireEvent.click(screen.getByRole("button", { name: "最小化窗口" }));
    fireEvent.click(screen.getByRole("button", { name: "最大化窗口" }));
    fireEvent.click(screen.getByRole("button", { name: "关闭窗口" }));

    await waitFor(() => {
      expect(appWindow.minimize).toHaveBeenCalledOnce();
      expect(appWindow.toggleMaximize).toHaveBeenCalledOnce();
      expect(appWindow.close).toHaveBeenCalledOnce();
    });
  });

  it("toggles window size when the drag region is double-clicked", async () => {
    const { container } = render(<WindowTitleBar />);
    fireEvent.doubleClick(container.querySelector(".window-titlebar")!);
    await waitFor(() => expect(appWindow.toggleMaximize).toHaveBeenCalledOnce());
  });
});
