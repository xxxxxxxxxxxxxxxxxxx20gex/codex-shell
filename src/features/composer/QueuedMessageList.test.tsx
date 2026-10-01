// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { QueuedTurnInput } from "../runtime/useQueuedTurns";
import { QueuedMessageList } from "./QueuedMessageList";

afterEach(cleanup);

const item: QueuedTurnInput = {
  id: "queued-1", text: "检查最近的改动", mentions: [], skills: [], images: [], collaborationMode: "default",
  settings: { modelId: "test", reasoningEffort: null, reasoningSummary: null, verbosity: null, serviceTier: "default" },
  permissionMode: "workspace", approvalReviewer: "user",
};
function props() {
  return { items: [item], running: true, canSteer: true, readFile: vi.fn(async () => ""), onEdit: vi.fn(), onSteer: vi.fn(async () => {}), onRemove: vi.fn(), onResume: vi.fn(), onError: vi.fn() };
}

it("edits the selected queue item from the menu and keeps direct removal independent", () => {
  const callbacks = props();
  render(<QueuedMessageList {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: /消息操作/ }));
  fireEvent.click(screen.getByRole("menuitem", { name: "编辑消息" }));
  expect(callbacks.onEdit).toHaveBeenCalledWith(item);
  expect(callbacks.onRemove).not.toHaveBeenCalled();
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /取消待发送消息/ }));
  expect(callbacks.onRemove).toHaveBeenCalledWith(item.id);
});

it("supports menu keyboard navigation, Escape focus return, outside dismissal and toggle", () => {
  render(<QueuedMessageList {...props()} />);
  const trigger = screen.getByRole("button", { name: /消息操作/ });
  fireEvent.click(trigger);
  expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "编辑消息" }));
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "取消待发送" }));
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.click(trigger);
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
  expect(screen.queryByRole("menu")).toBeNull();
});

it("prevents repeat steer requests and reports a failure without removing the item", async () => {
  let reject!: (reason: Error) => void;
  const callbacks = props();
  callbacks.onSteer = vi.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
  render(<QueuedMessageList {...callbacks} />);
  const steer = screen.getByRole("button", { name: /引导发送/ });
  fireEvent.click(steer);
  fireEvent.click(steer);
  expect(callbacks.onSteer).toHaveBeenCalledTimes(1);
  expect((steer as HTMLButtonElement).disabled).toBe(true);
  const error = new Error("引导失败");
  await act(async () => { reject(error); });
  expect(callbacks.onError).toHaveBeenCalledWith(error);
  expect(callbacks.onRemove).not.toHaveBeenCalled();
  expect((steer as HTMLButtonElement).disabled).toBe(false);
});

it("retains idle resume and explains when steering is unavailable", () => {
  const callbacks = props();
  const view = render(<QueuedMessageList {...callbacks} canSteer={false} />);
  expect((screen.getByRole("button", { name: /引导发送/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByTitle("当前阶段暂不可引导")).toBeTruthy();
  view.rerender(<QueuedMessageList {...callbacks} running={false} />);
  expect(screen.queryByRole("button", { name: /引导发送/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "继续发送" }));
  expect(callbacks.onResume).toHaveBeenCalledOnce();
});

it("renders attachment-only previews and closes the menu when its item disappears", async () => {
  const callbacks = props();
  const imageItem = { ...item, text: "", images: [{ name: "示意图.png", url: "data:image/png;base64,AA==" }] };
  const view = render(<QueuedMessageList {...callbacks} items={[imageItem]} />);
  expect(screen.getByRole("img", { name: "示意图.png" }).getAttribute("src")).toBe(imageItem.images[0].url);
  expect(screen.getByText("示意图.png")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /消息操作/ }));
  view.rerender(<QueuedMessageList {...callbacks} items={[]} />);
  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  expect(callbacks.readFile).not.toHaveBeenCalled();
});
