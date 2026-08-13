import { describe, expect, it, vi } from "vitest";
import { sendOrQueue } from "./useAgentSession";

describe("sendOrQueue", () => {
  it("queues a follow-up while the active Turn is running", async () => {
    const send = vi.fn(async () => true);
    const queue = vi.fn(() => true);

    await expect(sendOrQueue({ running: true, send, queue }, "next task", [], [], "default"))
      .resolves.toBe(true);
    expect(queue).toHaveBeenCalledWith("next task", [], [], "default");
    expect(send).not.toHaveBeenCalled();
  });

  it("starts a Turn while the Session is idle", async () => {
    const send = vi.fn(async () => true);
    const queue = vi.fn(() => true);

    await expect(sendOrQueue({ running: false, send, queue }, "new task", [], [], "plan"))
      .resolves.toBe(true);
    expect(send).toHaveBeenCalledWith("new task", [], [], "plan");
    expect(queue).not.toHaveBeenCalled();
  });
});
