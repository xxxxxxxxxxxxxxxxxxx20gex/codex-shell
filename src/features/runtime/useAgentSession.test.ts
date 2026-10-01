import { describe, expect, it, vi } from "vitest";
import {
  isExpectedCustomModelMetadataWarning,
  isOmittedServiceTierWarning,
  sendOrQueue,
  updateRetryingError,
  visibleRetryingMessage,
  windowsSandboxSetupMessage,
} from "./useAgentSession";

describe("custom model metadata warning", () => {
  it("recognizes only the fallback warning for the active custom model", () => {
    const warning = "Model metadata for 'gpt-6-sol' not found. Defaulting to fallback metadata: this can degrade performance and cause issues.";
    expect(isExpectedCustomModelMetadataWarning(warning, "gpt-6-sol")).toBe(true);
    expect(isExpectedCustomModelMetadataWarning(warning, "gpt-6-astra")).toBe(false);
    expect(isExpectedCustomModelMetadataWarning("Model metadata for 'gpt-6-sol' not found.", "gpt-6-sol")).toBe(false);
  });

  it("silences metadata warnings for CS built-in OpenAI model IDs", () => {
    expect(isExpectedCustomModelMetadataWarning("Model metadata for 'GPT-6-SOL' not found. Defaulting to fallback metadata: this can degrade performance and cause issues.", "gpt-6-sol")).toBe(true);
  });

  it("matches the warning after the model changes without recreating the subscription", () => {
    const currentModelId = { current: "gpt-6-sol" };
    const warning = "Model metadata for 'gpt-6-sol' not found. Defaulting to fallback metadata: this can degrade performance and cause issues.";
    expect(isExpectedCustomModelMetadataWarning(warning, currentModelId.current)).toBe(true);
    currentModelId.current = "gpt-6-astra";
    expect(isExpectedCustomModelMetadataWarning(warning, currentModelId.current)).toBe(false);
  });
});

describe("unsupported service tier warning", () => {
  const warning = "Configured service tier `priority` is not advertised as supported for model `gpt-6.1-sol` and will be omitted from requests.";

  it("silences only the omitted-tier notice for the active model", () => {
    expect(isOmittedServiceTierWarning(warning, "gpt-6.1-sol")).toBe(true);
    expect(isOmittedServiceTierWarning(warning, "gpt-6-sol")).toBe(false);
    expect(isOmittedServiceTierWarning("Configured service tier `priority` failed for model `gpt-6.1-sol`.", "gpt-6.1-sol")).toBe(false);
  });
});

describe("Windows Sandbox setup notice", () => {
  it("points an unconfigured sandbox to the administrator setup action", () => {
    expect(windowsSandboxSetupMessage("notConfigured")).toBe(
      "请前往“设置 → 运行环境”，点击“使用管理员权限配置”。",
    );
  });

  it("points a sandbox update to the same administrator setup action", () => {
    expect(windowsSandboxSetupMessage("updateRequired")).toBe(
      "Windows Sandbox 需要更新。请前往“设置 → 运行环境”，点击“使用管理员权限配置”。",
    );
  });
});

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
