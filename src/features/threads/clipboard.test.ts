// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { writeClipboardText } from "./clipboard";

afterEach(() => { vi.restoreAllMocks(); Reflect.deleteProperty(document, "execCommand"); document.body.replaceChildren(); });

it("does not create a fallback input when the clipboard API succeeds", async () => {
  const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  await writeClipboardText("text");
  expect(write).toHaveBeenCalledWith("text");
  expect(document.querySelector("textarea")).toBeNull();
});

it.each([false, "throw"])("cleans up and restores focus after fallback failure: %s", async (failure) => {
  vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
  Object.defineProperty(document, "execCommand", { configurable: true, value: () => {
    if (failure === "throw") throw new Error("copy failed");
    return false;
  } });
  const input = document.createElement("input"); document.body.append(input); input.focus();
  await expect(writeClipboardText("text")).rejects.toThrow();
  expect(document.querySelector("textarea")).toBeNull();
  expect(document.activeElement).toBe(input);
});
