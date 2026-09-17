// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createPortal } from "react-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ContextMenuPolicy } from "./ContextMenuPolicy";
import { writeClipboardText } from "../threads/clipboard";
import { MarkdownContent } from "../threads/MarkdownContent";
import { TurnFileChanges } from "../threads/TurnFileChanges";
import { TurnResourceOutputs } from "../threads/TurnResourceOutputs";
import { ImageAttachmentPreview } from "../attachments/AttachmentGallery";

vi.mock("../threads/clipboard", () => ({ writeClipboardText: vi.fn() }));

it("copies resolved paths from reply links, resource thumbnails and file changes", async () => {
  const writeText = vi.mocked(writeClipboardText).mockResolvedValue();
  render(<><ContextMenuPolicy projectPath="C:/work" />
    <MarkdownContent>{"[文档](docs/guide.md:12) [网络](https://example.com) [共享](file://server/share/test.pdf)"}</MarkdownContent>
    <ImageAttachmentPreview path="D:/images/地图.png" readFile={async () => "AA=="} />
    <TurnResourceOutputs items={[{ type: "agentMessage", id: "a", text: "[图](result.png)", phase: "final_answer", memoryCitation: null, delivery: null, questions: null }]} onOpenPath={vi.fn()} />
    <TurnFileChanges items={[{ type: "fileChange", id: "f", status: "completed", changes: [{path: "src/main.ts", kind: {type: "update", move_path: null}, diff: ""}] }]} onOpenPath={vi.fn()} />
  </>);
  for (const [label, path] of [["文档", "C:/work/docs/guide.md"], ["共享", "\\\\server\\share\\test.pdf"], ["result.png", "C:/work/result.png"], ["地图.png", "D:/images/地图.png"], ["src/main.ts", "C:/work/src/main.ts"]]) {
    fireEvent.contextMenu(screen.getByText(label));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["复制绝对路径"]);
    fireEvent.click(screen.getByRole("menuitem"));
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith(path));
  }
  fireEvent.contextMenu(screen.getByText("网络"));
  expect(screen.queryByRole("menu")).toBeNull();
});

it("normalizes parent segments before copying a resource path", async () => {
  const writeText = vi.mocked(writeClipboardText).mockResolvedValue();
  render(<><ContextMenuPolicy projectPath="C:/work/project" /><button data-local-path="../shared/report.pdf">上级文档</button></>);
  fireEvent.contextMenu(screen.getByText("上级文档"));
  fireEvent.click(screen.getByRole("menuitem", { name: "复制绝对路径" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("C:/work/shared/report.pdf"));
});

it("handles resource SVG targets, current project changes and missing project errors", async () => {
  const writeText = vi.mocked(writeClipboardText).mockResolvedValue();
  const view = render(<><ContextMenuPolicy projectPath="C:/first" /><button data-local-path="image.png"><svg data-testid="icon" /></button></>);
  fireEvent.contextMenu(screen.getByTestId("icon"));
  fireEvent.click(screen.getByRole("menuitem"));
  await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("C:/first/image.png"));
  view.rerender(<><ContextMenuPolicy projectPath="D:/second" /><button data-local-path="image.png">资源</button></>);
  fireEvent.contextMenu(screen.getByText("资源"));
  fireEvent.click(screen.getByRole("menuitem"));
  await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("D:/second/image.png"));
  view.rerender(<><ContextMenuPolicy /><button data-local-path="image.png">资源</button></>);
  writeText.mockClear();
  fireEvent.contextMenu(screen.getByText("资源"));
  fireEvent.click(screen.getByRole("menuitem"));
  expect((await screen.findByRole("alert")).textContent).toContain("无法解析文件绝对路径");
  expect(writeText).not.toHaveBeenCalled();
});

afterEach(() => { cleanup(); window.getSelection()?.removeAllRanges(); vi.restoreAllMocks(); });

it("uses exactly three editing actions in text fields including portals", () => {
  const view = render(<><ContextMenuPolicy /><button>操作</button><input aria-label="文本" /><input aria-label="密码" type="password" />
    <input aria-label="只读" readOnly /><input aria-label="禁用" disabled /><input aria-label="勾选" type="checkbox" />
    {createPortal(<textarea aria-label="弹窗输入" />, document.body)}</>);
  for (const name of ["文本", "密码", "只读", "弹窗输入"]) {
    expect(fireEvent.contextMenu(screen.getByLabelText(name))).toBe(false);
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["全选", "复制", "粘贴"]);
  }
  for (const name of ["禁用", "勾选"]) expect(fireEvent.contextMenu(screen.getByLabelText(name))).toBe(false);
  expect(fireEvent.contextMenu(screen.getByRole("button"))).toBe(false);
  expect(fireEvent.contextMenu(document.body)).toBe(false);
  view.unmount();
  expect(fireEvent.contextMenu(document.body)).toBe(true);
});

it("selects all, copies the selection and disables unsafe actions", async () => {
  const writeText = vi.mocked(writeClipboardText).mockResolvedValue();
  render(<><ContextMenuPolicy /><textarea aria-label="草稿" defaultValue="hello world" /><input aria-label="只读" readOnly defaultValue="read" /><input aria-label="密码" type="password" defaultValue="secret" /></>);
  const input = screen.getByLabelText("草稿") as HTMLTextAreaElement;
  fireEvent.contextMenu(input);
  expect((screen.getByRole("menuitem", { name: "复制" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("menuitem", { name: "全选" }));
  expect([input.selectionStart, input.selectionEnd]).toEqual([0, 11]);
  input.setSelectionRange(0, 5);
  fireEvent.contextMenu(input);
  fireEvent.click(screen.getByRole("menuitem", { name: "复制" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("hello"));
  fireEvent.contextMenu(screen.getByLabelText("只读"));
  expect((screen.getByRole("menuitem", { name: "粘贴" }) as HTMLButtonElement).disabled).toBe(true);
  const password = screen.getByLabelText("密码") as HTMLInputElement;
  password.select(); fireEvent.contextMenu(password);
  expect((screen.getByRole("menuitem", { name: "复制" }) as HTMLButtonElement).disabled).toBe(true);
});

it("lets existing custom menus handle their own events", () => {
  const handled = vi.fn();
  render(<><ContextMenuPolicy /><button onContextMenu={(event) => { event.preventDefault(); handled(); }}>文件</button></>);
  fireEvent.contextMenu(screen.getByRole("button"));
  expect(handled).toHaveBeenCalledOnce();
  expect(screen.queryByRole("menu")).toBeNull();
});

it("reports clipboard permission failure without changing the draft", async () => {
  vi.spyOn(navigator.clipboard, "read").mockRejectedValue(new Error("denied"));
  render(<><ContextMenuPolicy /><textarea aria-label="草稿" defaultValue="保留草稿" /></>);
  const input = screen.getByLabelText("草稿") as HTMLTextAreaElement;
  fireEvent.contextMenu(input);
  fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
  expect(document.activeElement?.textContent).toBe("粘贴");
  fireEvent.click(screen.getByRole("menuitem", { name: "粘贴" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Ctrl+V");
  expect(input.value).toBe("保留草稿");
});

it("rejects an async paste if the draft changed while reading clipboard", async () => {
  let resolve!: (items: ClipboardItem[]) => void;
  vi.spyOn(navigator.clipboard, "read").mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<><ContextMenuPolicy /><textarea aria-label="草稿" defaultValue="之前" /></>);
  const input = screen.getByLabelText("草稿") as HTMLTextAreaElement;
  fireEvent.contextMenu(input);
  fireEvent.click(screen.getByRole("menuitem", { name: "粘贴" }));
  fireEvent.change(input, { target: { value: "之后" } });
  resolve([]);
  expect((await screen.findByRole("alert")).textContent).toContain("输入状态已变化");
  expect(input.value).toBe("之后");
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
