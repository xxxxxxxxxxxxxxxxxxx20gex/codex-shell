import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TurnProcessEvents } from "./TurnProcessEvents";

describe("TurnProcessEvents", () => {
  it("renders safe summaries for auto review and terminal interaction", () => {
    const markup = renderToStaticMarkup(<TurnProcessEvents events={[
      {
        kind: "autoApprovalReview",
        reviewId: "review-1",
        status: "completed",
        startedAtMs: 100,
        completedAtMs: 200,
        reviewStatus: "approved",
        riskLevel: "medium",
        decisionSource: "agent",
        targetItemId: "command-1",
      },
      {
        kind: "terminalInteraction",
        itemId: "command-1",
        processId: "42",
        stdinLength: 13,
      },
    ]} />);

    expect(markup).toContain("自动审查已批准 · 风险 medium");
    expect(markup).toContain("已向运行中的命令发送输入 · 13 字符");
    expect(markup).not.toContain("stdin");
  });
});
