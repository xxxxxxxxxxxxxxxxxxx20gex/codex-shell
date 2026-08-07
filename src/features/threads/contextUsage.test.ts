import { describe, expect, it } from "vitest";
import type { ThreadTokenUsage } from "../../generated/app-server/v2/ThreadTokenUsage";
import { contextUsageView } from "./contextUsage";

function usage(lastTokens: number, totalTokens: number, modelContextWindow: number | null): ThreadTokenUsage {
  const breakdown = (total: number) => ({
    totalTokens: total,
    inputTokens: total,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
  });
  return {
    last: breakdown(lastTokens),
    total: breakdown(totalTokens),
    modelContextWindow,
  };
}

describe("contextUsageView", () => {
  it("uses app-server's active context and reported window without a local threshold", () => {
    expect(contextUsageView(usage(64_000, 180_000, 128_000))).toEqual({
      contextTokens: 64_000,
      sessionTokens: 180_000,
      contextWindow: 128_000,
      percentage: 50,
    });
  });

  it("keeps token counts visible when the model does not report a context window", () => {
    expect(contextUsageView(usage(12_345, 45_678, null))).toEqual({
      contextTokens: 12_345,
      sessionTokens: 45_678,
      contextWindow: null,
      percentage: null,
    });
  });

  it("caps only the visual percentage when usage exceeds the reported window", () => {
    expect(contextUsageView(usage(140_000, 200_000, 128_000)).percentage).toBe(100);
  });
});
