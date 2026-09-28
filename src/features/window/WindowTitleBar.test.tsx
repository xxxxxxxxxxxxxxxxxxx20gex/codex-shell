// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WindowTitleBar } from "./WindowTitleBar";
import productMarkUrl from "../../../assets/branding/cs-app-icon.svg";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  isMaximized: vi.fn().mockResolvedValue(true),
  onResized: vi.fn().mockResolvedValue(() => {}),
  minimize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: () => mocks }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("uses monitor-aware restore for both the window button and title-bar double-click", async () => {
  vi.stubGlobal("__TAURI_INTERNALS__", {});
  const { container } = render(<WindowTitleBar />);
  const restore = await screen.findByRole("button", { name: "还原窗口" });
  fireEvent.click(restore);
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("toggle_window_maximized"));
  fireEvent.doubleClick(container.querySelector("header")!);
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
  fireEvent.doubleClick(restore);
  expect(mocks.invoke).toHaveBeenCalledTimes(2);
});

it("uses the shared CS product mark", () => {
  const { container } = render(<WindowTitleBar />);
  const mark = container.querySelector<HTMLImageElement>(".window-title-mark");
  expect(mark?.getAttribute("src")).toBe(productMarkUrl);
  expect(mark?.getAttribute("aria-hidden")).toBe("true");
});

it("keeps minimize and close actions on the frameless shell", async () => {
  vi.stubGlobal("__TAURI_INTERNALS__", {});
  render(<WindowTitleBar />);
  fireEvent.click(screen.getByRole("button", { name: "最小化窗口" }));
  fireEvent.click(screen.getByRole("button", { name: "关闭窗口" }));
  await waitFor(() => {
    expect(mocks.minimize).toHaveBeenCalledOnce();
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
