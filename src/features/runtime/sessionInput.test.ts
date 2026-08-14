import { describe, expect, it } from "vitest";
import { buildUserInput } from "./sessionInput";

describe("buildUserInput", () => {
  it("sends file paths as text elements and skills as native inputs", () => {
    expect(buildUserInput(
      "review this",
      [{ name: "App.tsx", path: "C:\\work\\App.tsx" }],
      [{ name: "code-review", path: "C:\\skills\\code-review\\SKILL.md" }],
    )).toEqual([
      {
        type: "text",
        text: "review this\n\nAttached files:\n- C:\\work\\App.tsx",
        text_elements: [{
          byteRange: { start: 31, end: 46 },
          placeholder: "App.tsx",
        }],
      },
      { type: "skill", name: "code-review", path: "C:\\skills\\code-review\\SKILL.md" },
    ]);
  });

  it("uses UTF-8 byte offsets for paths containing non-ASCII characters", () => {
    const input = buildUserInput("检查", [{ name: "说明.md", path: "C:\\项目\\说明.md" }], [])[0];

    expect(input).toEqual({
      type: "text",
      text: "检查\n\nAttached files:\n- C:\\项目\\说明.md",
      text_elements: [{
        byteRange: { start: 26, end: 45 },
        placeholder: "说明.md",
      }],
    });
  });

  it("sends selected images as native localImage inputs", () => {
    expect(buildUserInput("inspect", [], [], [{ name: "screen.png", path: "C:\\work\\screen.png" }])).toEqual([
      { type: "text", text: "inspect", text_elements: [] },
      { type: "localImage", path: "C:\\work\\screen.png" },
    ]);
    expect(buildUserInput("inspect", [], [], [{ name: "pasted.png", url: "data:image/png;base64,AA==" }])).toEqual([
      { type: "text", text: "inspect", text_elements: [] },
      { type: "image", url: "data:image/png;base64,AA==" },
    ]);
  });
});
