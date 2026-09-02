import { describe, expect, it, vi } from "vitest";
import {
  sendOrQueue,
  updateRetryingError,
  visibleRetryingMessage,
} from "./useAgentSession";

describe("retrying error lifecycle", () => {
  it("clears a retry banner when the matching Turn settles", () => {
    const retrying = updateRetryingError(null, {
      type: "retrying",
      threadId: "thread-1",
      message: "Reconnecting... 1/5",
    });

    expect(visibleRetryingMessage(retrying, "thread-1")).toBe("Reconnecting... 1/5");
    expect(updateRetryingError(retrying, { type: "settled", threadId: "thread-1" })).toBeNull();
  });

  it("does not leak retry banners into another Session or clear unrelated retries", () => {
    const retrying = {
      threadId: "thread-1",
      message: "Reconnecting... 2/5",
    };

    expect(visibleRetryingMessage(retrying, "thread-2")).toBe("");
    expect(updateRetryingError(retrying, { type: "settled", threadId: "thread-2" })).toEqual(retrying);
  });
});

describe("sendOrQueue", () => {
  it("queues a follow-up while the active Turn is running", async () => {
    const send = vi.fn(async () => true);
    const queue = vi.fn(() => true);

    await expect(sendOrQueue({ running: true, send, queue }, "next task", [], [], "default"))
      .resolves.toBe(true);
    expect(queue).toHaveBeenCalledWith("next task", [], [], "default", []);
    expect(send).not.toHaveBeenCalled();
  });

  it("starts a Turn while the Session is idle", async () => {
    const send = vi.fn(async () => true);
    const queue = vi.fn(() => true);

    await expect(sendOrQueue({ running: false, send, queue }, "new task", [], [], "plan"))
      .resolves.toBe(true);
    expect(send).toHaveBeenCalledWith("new task", [], [], "plan", []);
    expect(queue).not.toHaveBeenCalled();
  });
});
