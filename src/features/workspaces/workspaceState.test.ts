import { describe, expect, it } from "vitest";
import {
  activeFileMentionQuery,
  isPathWithinRoot,
  isDefaultProjectPath,
  joinProjectPath,
  replaceActiveFileMention,
  resolveFileSearchPath,
  resolveLinkedProjectPath,
  resolveProjectRelativePath,
  projectRelativePath,
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
    expect(joinProjectPath("C:\\work", "src")).toBe("C:\\work\\src");
    expect(joinProjectPath("/work/", "src")).toBe("/work/src");
  });

  it("resolves only files contained by the workspace", () => {
    expect(resolveProjectRelativePath("C:\\work", "src/App.tsx")).toBe("C:\\work\\src\\App.tsx");
    expect(resolveProjectRelativePath("C:\\work", "../secret.txt")).toBeNull();
    expect(resolveProjectRelativePath("C:\\work", "D:\\other.txt")).toBeNull();
  });

  it("resolves linked files without allowing relative traversal", () => {
    expect(resolveLinkedProjectPath("C:\\work", "src/App.tsx")).toBe("C:\\work\\src\\App.tsx");
    expect(resolveLinkedProjectPath("C:\\work", "D:/shared/readme.md")).toBe("D:/shared/readme.md");
    expect(resolveLinkedProjectPath("C:\\work", "../secret.txt")).toBeNull();
    expect(resolveLinkedProjectPath("C:\\work", "C:\\work\\..\\secret.txt")).toBeNull();
    expect(isPathWithinRoot("C:\\work", "C:\\work\\src\\App.tsx")).toBe(true);
    expect(isPathWithinRoot("C:\\work", "C:\\workspace\\App.tsx")).toBe(false);
  });

  it("renders paths relative to the selected workspace", () => {
    expect(projectRelativePath("C:\\Work", "C:\\work\\src\\App.tsx")).toBe("src\\App.tsx");
  });

  it("recognizes only paths inside the managed default workspace root", () => {
    expect(isDefaultProjectPath(
      "C:\\Users\\example\\Documents\\Codex-Shell\\2026-08-10",
      "C:\\Users\\example\\Documents\\Codex-Shell",
    )).toBe(true);
    expect(isDefaultProjectPath(
      "C:\\Users\\example\\Documents\\Codex-Shell-Project",
      "C:\\Users\\example\\Documents\\Codex-Shell",
    )).toBe(false);
  });
});
