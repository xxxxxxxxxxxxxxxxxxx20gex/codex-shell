// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TurnFileChanges } from "./TurnFileChanges";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";

afterEach(cleanup);
const items: Extract<ThreadItem, { type: "fileChange" }>[] = [{ type: "fileChange", id: "file", status: "completed", changes: [{ path: "index.html", kind: { type: "add" }, diff: "" }] }];
it("opens generated files and locates them in Explorer", () => {
  const open = vi.fn();
  const reveal = vi.fn();
  render(<TurnFileChanges items={items} onOpenPath={open} onOpenInExplorer={reveal} />);
  fireEvent.click(screen.getByText("index.html"));
  fireEvent.click(screen.getByRole("button", { name: /定位/ }));
  expect(open).toHaveBeenCalledWith("index.html");
  expect(reveal).toHaveBeenCalledWith("index.html");
});
it("shows opening failures", async () => {
  render(<TurnFileChanges items={items} onOpenPath={async () => { throw new Error("File missing"); }} />);
  fireEvent.click(screen.getByText("index.html"));
  expect((await screen.findByRole("alert")).textContent).toBe("File missing");
});
