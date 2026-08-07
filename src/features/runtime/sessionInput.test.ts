import { describe, expect, it } from "vitest";
import { buildUserInput } from "./sessionInput";

describe("buildUserInput", () => {
  it("sends selected skills and file mentions as native app-server inputs", () => {
    expect(buildUserInput(
      "review this",
      [{ name: "App.tsx", path: "C:\\work\\App.tsx" }],
      [{ name: "code-review", path: "C:\\skills\\code-review\\SKILL.md" }],
    )).toEqual([
      { type: "text", text: "review this", text_elements: [] },
      { type: "skill", name: "code-review", path: "C:\\skills\\code-review\\SKILL.md" },
      { type: "mention", name: "App.tsx", path: "C:\\work\\App.tsx" },
    ]);
  });
});
