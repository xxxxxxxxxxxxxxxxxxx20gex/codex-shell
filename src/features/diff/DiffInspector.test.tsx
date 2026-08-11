// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DiffInspector } from "./DiffInspector";

describe("DiffInspector", () => {
  it("summarizes file states and opens a changed file in the workspace", () => {
    const onOpenFile = vi.fn();
    render(
      <DiffInspector
        diff={[
          "diff --git a/src/new.ts b/src/new.ts",
          "new file mode 100644",
          "--- /dev/null",
          "+++ b/src/new.ts",
          "+export {};",
        ].join("\n")}
        onOpenFile={onOpenFile}
      />,
    );

    expect(screen.getByLabelText("文件变更摘要").textContent).toContain("新增 1");
    fireEvent.click(screen.getByRole("button", { name: "在工作区查看" }));

    expect(onOpenFile).toHaveBeenCalledWith("src/new.ts");
  });
});
