import { describe, expect, it } from "vitest";
import { buildHostInstructions } from "./hostInstructions";

describe("CS host context", () => {
  it("provides product boundaries without requiring personalization", () => {
    const instructions = buildHostInstructions();
    expect(instructions).toContain("你当前运行于 Codex Shell");
    expect(instructions).toContain("并非 OpenAI 官方 Codex 桌面端");
    expect(instructions).toContain("不从 Codex 或 CS 的名称推断模型厂商及版本");
    expect(buildHostInstructions("  ")).toBe(instructions);
  });

  it("retains user instructions after the separate host context", () => {
    const custom = "先给结论。\n保留详细验证结果。";
    expect(buildHostInstructions(`  ${custom}  `)).toBe(`${buildHostInstructions()}\n\n${custom}`);
  });
});
