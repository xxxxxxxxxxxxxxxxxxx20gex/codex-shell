import { describe, expect, it } from "vitest";
import {
  assertModelVisibleInput,
  MAX_MODEL_VISIBLE_INPUT_BYTES,
  modelVisibleInputBytes,
} from "./modelVisibleInput";

describe("model-visible input limits", () => {
  it("measures UTF-8 bytes and rejects oversized context fragments", () => {
    expect(modelVisibleInputBytes("中")).toBe(3);
    expect(() => assertModelVisibleInput("a".repeat(MAX_MODEL_VISIBLE_INPUT_BYTES), "消息")).not.toThrow();
    expect(() => assertModelVisibleInput("中".repeat(3_000), "消息")).toThrow(/不能超过 8000 UTF-8 字节/);
  });
});
