// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MarkdownContent } from "./MarkdownContent";
import { writeClipboardText } from "./clipboard";

vi.mock("./clipboard", () => ({ writeClipboardText: vi.fn(async () => {}) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("copies only the selected table as TSV, including headers, empty cells and formatted text", async () => {
  const view = render(<MarkdownContent>{"前文\n\n| 设置 | 内容 |\n| --- | --- |\n| **模型** | `gpt-test` |\n| 链接 | [官网](https://example.com) |\n| 空值 | |\n\n后文\n\n| 另一张 | 表 |\n| --- | --- |\n| A | B |"}</MarkdownContent>);
  fireEvent.click(view.getAllByRole("button", { name: "复制表格" })[0]);
  await waitFor(() => expect(writeClipboardText).toHaveBeenCalledWith("设置\t内容\r\n模型\tgpt-test\r\n链接\t官网\r\n空值\t"));
  expect(view.getByText("已复制")).toBeTruthy();
});

it("copies the current streaming table content", async () => {
  const view = render(<MarkdownContent>{"| A | B |\n| - | - |\n| 1 | 2 |"}</MarkdownContent>);
  view.rerender(<MarkdownContent>{"| A | B |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |"}</MarkdownContent>);
  fireEvent.click(view.getByRole("button", { name: "复制表格" }));
  await waitFor(() => expect(writeClipboardText).toHaveBeenCalledWith("A\tB\r\n1\t2\r\n3\t4"));
});

it("reports clipboard failure and permits retry", async () => {
  vi.mocked(writeClipboardText).mockRejectedValueOnce(new Error("denied"));
  const view = render(<MarkdownContent>{"| A | B |\n| - | - |\n| 1 | 2 |"}</MarkdownContent>);
  fireEvent.click(view.getByRole("button", { name: "复制表格" }));
  await waitFor(() => expect(view.getByText("复制失败，请重试")).toBeTruthy());
  fireEvent.click(view.getByRole("button", { name: "复制表格" }));
  await waitFor(() => expect(view.getByText("已复制")).toBeTruthy());
});
