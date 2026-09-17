// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createPortal } from "react-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ContextMenuPolicy } from "./ContextMenuPolicy";
import { writeClipboardText } from "../threads/clipboard";

vi.mock("../threads/clipboard", () => ({ writeClipboardText: vi.fn() }));

afterEach(() => { cleanup(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks(); });

it("blocks page menus while preserving editable and readonly text fields including portals", () => {
  const view = render(<><ContextMenuPolicy /><button>操作</button><input aria-label="文本" /><input aria-label="密码" type="password" />
    <input aria-label="只读" readOnly /><input aria-label="禁用" disabled /><input aria-label="勾选" type="checkbox" />
    {createPortal(<textarea aria-label="弹窗输入" />, document.body)}</>);
  for (const name of ["文本", "密码", "只读", "弹窗输入"]) expect(fireEvent.contextMenu(screen.getByLabelText(name))).toBe(true);
  for (const name of ["禁用", "勾选"]) expect(fireEvent.contextMenu(screen.getByLabelText(name))).toBe(false);
  expect(fireEvent.contextMenu(screen.getByRole("button"))).toBe(false);
  expect(fireEvent.contextMenu(document.body)).toBe(false);
  view.unmount();
  expect(fireEvent.contextMenu(document.body)).toBe(true);
});

it("lets existing custom menus handle their own events", () => {
  const handled = vi.fn();
  render(<><ContextMenuPolicy /><button onContextMenu={(event) => { event.preventDefault(); handled(); }}>文件</button></>);
  fireEvent.contextMenu(screen.getByRole("button"));
  expect(handled).toHaveBeenCalledOnce();
  expect(screen.queryByRole("menu")).toBeNull();
});

it("copies a snapshot of selected body text and reports clipboard failure", async () => {
  const writeText = vi.mocked(writeClipboardText).mockResolvedValue();
  render(<><ContextMenuPolicy /><p>选中的正文</p></>);
  const text = screen.getByText("选中的正文");
  const range = document.createRange(); range.selectNodeContents(text.firstChild!);
  // happy-dom's partial-containment check differs from Chromium; browser coverage tests the real selection.
  vi.spyOn(window.getSelection()!, "containsNode").mockReturnValue(true);
  window.getSelection()!.addRange(range);
  fireEvent.contextMenu(text);
  expect(screen.getAllByRole("menuitem")).toHaveLength(1);
  window.getSelection()!.removeAllRanges();
  fireEvent.click(screen.getByRole("menuitem", { name: "复制" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("选中的正文"));
  writeText.mockRejectedValue(new Error("剪贴板不可用"));
  window.getSelection()!.addRange(range);
  fireEvent.contextMenu(text);
  fireEvent.click(screen.getByRole("menuitem", { name: "复制" }));
  expect((await screen.findByRole("alert")).textContent).toContain("剪贴板不可用");
});
