import { describe, expect, it } from "vitest";
import { collaborationModeForIntent, toggleComposerIntent } from "./composerIntent";

describe("composer intent", () => {
  it("keeps plan and goal mutually exclusive", () => {
    expect(toggleComposerIntent("goal", "plan")).toBe("plan");
    expect(toggleComposerIntent("plan", "goal")).toBe("goal");
  });

  it("toggles the selected intent off", () => {
    expect(toggleComposerIntent("plan", "plan")).toBe("default");
    expect(toggleComposerIntent("goal", "goal")).toBe("default");
  });

  it("maps only plan to the app-server collaboration mode", () => {
    expect(collaborationModeForIntent("plan")).toBe("plan");
    expect(collaborationModeForIntent("goal")).toBe("default");
    expect(collaborationModeForIntent("default")).toBe("default");
  });
});

