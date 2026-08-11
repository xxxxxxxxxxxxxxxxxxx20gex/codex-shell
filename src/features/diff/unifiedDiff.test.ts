import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "./unifiedDiff";

describe("parseUnifiedDiff", () => {
  it("groups files and counts changed lines", () => {
    const files = parseUnifiedDiff([
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,2 +1,2 @@",
      "-const oldValue = 1;",
      "+const newValue = 2;",
      " keep();",
      "diff --git a/src/b.ts b/src/b.ts",
      "--- a/src/b.ts",
      "+++ b/src/b.ts",
      "+export {};",
    ].join("\n"));

    expect(files.map(({ path, changeType, additions, deletions }) => ({ path, changeType, additions, deletions }))).toEqual([
      { path: "src/a.ts", changeType: "modified", additions: 1, deletions: 1 },
      { path: "src/b.ts", changeType: "modified", additions: 1, deletions: 0 },
    ]);
  });

  it("classifies added, deleted, and renamed files", () => {
    const files = parseUnifiedDiff([
      "diff --git a/new.ts b/new.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/new.ts",
      "+new();",
      "diff --git a/old.ts b/old.ts",
      "deleted file mode 100644",
      "--- a/old.ts",
      "+++ /dev/null",
      "-old();",
      "diff --git a/before.ts b/after.ts",
      "similarity index 100%",
      "rename from before.ts",
      "rename to after.ts",
    ].join("\n"));

    expect(files.map(({ path, oldPath, changeType }) => ({ path, oldPath, changeType }))).toEqual([
      { path: "new.ts", oldPath: "new.ts", changeType: "added" },
      { path: "old.ts", oldPath: "old.ts", changeType: "deleted" },
      { path: "after.ts", oldPath: "before.ts", changeType: "renamed" },
    ]);
  });
});
