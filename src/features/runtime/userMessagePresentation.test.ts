import { describe, expect, it } from "vitest";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { buildUserInput } from "./sessionInput";
import { userMessagePresentation } from "./userMessagePresentation";

function userMessage(content: Extract<ThreadItem, { type: "userMessage" }>["content"]): ThreadItem {
  return { type: "userMessage", id: "user-1", clientId: null, content };
}

describe("userMessagePresentation", () => {
  it("restores attached files without showing the internal path block", () => {
    const content = buildUserInput(
      "检查这些文件",
      [
        { name: "README.md", path: "C:\\work\\README.md" },
        { name: "说明.md", path: "C:\\项目\\说明.md" },
      ],
      [],
    );

    expect(userMessagePresentation(userMessage(content))).toEqual({
      text: "检查这些文件",
      files: [
        { name: "README.md", path: "C:\\work\\README.md" },
        { name: "说明.md", path: "C:\\项目\\说明.md" },
      ],
      images: [],
    });
  });

  it("restores local and data URL images", () => {
    expect(userMessagePresentation(userMessage([
      { type: "localImage", path: "C:\\work\\screen.png" },
      { type: "image", url: "data:image/png;base64,AA==" },
    ]))).toEqual({
      text: "",
      files: [],
      images: [
        { name: "screen.png", path: "C:\\work\\screen.png" },
        { name: "图片 2", url: "data:image/png;base64,AA==" },
      ],
    });
  });

  it("leaves ordinary text unchanged when it has no attachment elements", () => {
    expect(userMessagePresentation(userMessage([
      { type: "text", text: "正文中提到 Attached files: 但不是附件块", text_elements: [] },
    ]))).toEqual({
      text: "正文中提到 Attached files: 但不是附件块",
      files: [],
      images: [],
    });
  });

  it("restores an attachment-only message without exposing the path block", () => {
    const content = buildUserInput("", [{ name: "README.md", path: "C:\\work\\README.md" }], []);

    expect(userMessagePresentation(userMessage(content))).toEqual({
      text: "",
      files: [{ name: "README.md", path: "C:\\work\\README.md" }],
      images: [],
    });
  });

  it("keeps legacy local file mentions visible without treating resource mentions as files", () => {
    expect(userMessagePresentation(userMessage([
      { type: "mention", name: "legacy.txt", path: "C:\\work\\legacy.txt" },
      { type: "mention", name: "connector", path: "app://connector/item" },
    ]))).toEqual({
      text: "",
      files: [{ name: "legacy.txt", path: "C:\\work\\legacy.txt" }],
      images: [],
    });
  });
});
