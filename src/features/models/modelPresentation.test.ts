import { describe, expect, it } from "vitest";
import { modelIdDisplayName } from "./modelPresentation";

describe("modelIdDisplayName", () => {
  it("uses the desktop-style casing for GPT model IDs", () => {
    expect(modelIdDisplayName("gpt-5.6-sol")).toBe("GPT-5.6-Sol");
    expect(modelIdDisplayName("GPT-5.3-codex")).toBe("GPT-5.3-Codex");
  });

  it("preserves custom provider model IDs", () => {
    expect(modelIdDisplayName("deepseek-chat")).toBe("deepseek-chat");
  });
});
