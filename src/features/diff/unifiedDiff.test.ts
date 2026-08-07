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

    expect(files.map(({ path, additions, deletions }) => ({ path, additions, deletions }))).toEqual([
      { path: "src/a.ts", additions: 1, deletions: 1 },
      { path: "src/b.ts", additions: 1, deletions: 0 },
    ]);
  });
});
