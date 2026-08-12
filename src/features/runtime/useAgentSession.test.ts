import { describe, expect, it, vi } from "vitest";
import { sendOrSteer } from "./useAgentSession";

describe("sendOrSteer", () => {
  it("steers the active Turn instead of starting a second Turn", async () => {
    const send = vi.fn(async () => true);
    const steer = vi.fn(async () => true);

    await expect(sendOrSteer({ running: true, canSteer: true, send, steer }, "more context", [], [], "default"))
      .resolves.toBe(true);
    expect(steer).toHaveBeenCalledWith("more context", [], []);
    expect(send).not.toHaveBeenCalled();
  });

  it("starts a Turn while the Session is idle", async () => {
    const send = vi.fn(async () => true);
    const steer = vi.fn(async () => true);

    await expect(sendOrSteer({ running: false, canSteer: false, send, steer }, "new task", [], [], "plan"))
      .resolves.toBe(true);
    expect(send).toHaveBeenCalledWith("new task", [], [], "plan");
    expect(steer).not.toHaveBeenCalled();
  });

  it("does not submit into a non-steerable active Turn", async () => {
    const send = vi.fn(async () => true);
    const steer = vi.fn(async () => true);

    await expect(sendOrSteer({
      running: true,
      canSteer: false,
      send,
      steer,
    }, "wait for review", [], [], "default")).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
    expect(steer).not.toHaveBeenCalled();
  });
});
