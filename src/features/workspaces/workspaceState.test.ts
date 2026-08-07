import { describe, expect, it } from "vitest";
import {
  activeFileMentionQuery,
  joinWorkspacePath,
  replaceActiveFileMention,
  resolveFileSearchPath,
  workspaceRelativePath,
} from "./workspaceState";

describe("workspace composer helpers", () => {
  it("extracts and replaces the active mention token", () => {
    expect(activeFileMentionQuery("检查一下 @App")).toBe("App");
    expect(activeFileMentionQuery("@src/")).toBe("src/");
    expect(activeFileMentionQuery("普通消息")).toBeNull();
    expect(replaceActiveFileMention("检查 @App", "App.tsx")).toBe("检查 @App.tsx ");
  });

  it("resolves relative search results with the root separator", () => {
    expect(resolveFileSearchPath({
      root: "C:\\work\\demo",
      path: "src\\App.tsx",
      file_name: "App.tsx",
      match_type: "file",
      score: 1,
      indices: null,
    })).toBe("C:\\work\\demo\\src\\App.tsx");
  });
});

describe("workspace paths", () => {
  it("joins child names using the workspace path style", () => {
    expect(joinWorkspacePath("C:\\work", "src")).toBe("C:\\work\\src");
    expect(joinWorkspacePath("/work/", "src")).toBe("/work/src");
  });

  it("renders paths relative to the selected workspace", () => {
    expect(workspaceRelativePath("C:\\Work", "C:\\work\\src\\App.tsx")).toBe("src\\App.tsx");
  });
});
