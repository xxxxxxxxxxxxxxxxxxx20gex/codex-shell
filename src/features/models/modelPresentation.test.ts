import { describe, expect, it } from "vitest";
import { modelIdDisplayName } from "./modelPresentation";

describe("modelIdDisplayName", () => {
  it("renders model IDs in lowercase", () => {
    expect(modelIdDisplayName("gpt-5.6-sol")).toBe("gpt-5.6-sol");
    expect(modelIdDisplayName("GPT-5.3-Codex")).toBe("gpt-5.3-codex");
  });

  it("preserves custom provider model IDs", () => {
    expect(modelIdDisplayName("DeepSeek-Chat")).toBe("deepseek-chat");
  });
});
