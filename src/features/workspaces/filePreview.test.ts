import { describe, expect, it } from "vitest";
import { decodeFilePreview, formatFileSize, MAX_BINARY_PREVIEW_BYTES } from "./filePreview";

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

describe("decodeFilePreview", () => {
  it("decodes UTF-8 text with its byte size", () => {
    const encoded = encode(new TextEncoder().encode("第一行\nsecond"));

    expect(decodeFilePreview("notes.md", encoded)).toEqual({
      kind: "text",
      content: "第一行\nsecond",
      byteSize: 16,
      truncated: false,
    });
  });

  it("keeps images as data URLs", () => {
    expect(decodeFilePreview("logo.png", "AQID")).toEqual({
      kind: "image",
      dataUrl: "data:image/png;base64,AQID",
      byteSize: 3,
    });
  });

  it("does not render binary bytes as source text", () => {
    expect(decodeFilePreview("program.exe", encode(new Uint8Array([1, 0, 2])))).toEqual({
      kind: "binary",
      byteSize: 3,
    });
  });

  it("does not create a data URL for oversized previews", () => {
    const encoded = "A".repeat(Math.ceil((MAX_BINARY_PREVIEW_BYTES + 1) * 4 / 3));
    expect(decodeFilePreview("large.png", encoded)).toEqual({ kind: "tooLarge", byteSize: expect.any(Number) });
  });
});

describe("formatFileSize", () => {
  it("uses compact readable units", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2_048)).toBe("2.0 KB");
  });
});
