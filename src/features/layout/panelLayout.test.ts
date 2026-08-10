import { describe, expect, it } from "vitest";
import { resizedPanelWidth } from "./panelLayout";

const bounds = { left: 100, right: 1_500, width: 1_400 };

describe("resizedPanelWidth", () => {
  it("clamps both panels to their own minimum and maximum widths", () => {
    expect(resizedPanelWidth("sidebar", 120, bounds, 310)).toBe(200);
    expect(resizedPanelWidth("sidebar", 900, bounds, 310)).toBe(420);
    expect(resizedPanelWidth("inspector", 1_490, bounds, 244)).toBe(240);
    expect(resizedPanelWidth("inspector", 700, bounds, 244)).toBe(520);
  });

  it("reserves at least 440 pixels for the conversation", () => {
    const narrowBounds = { left: 0, right: 1_000, width: 1_000 };

    expect(resizedPanelWidth("sidebar", 500, narrowBounds, 310)).toBe(250);
    expect(resizedPanelWidth("inspector", 400, narrowBounds, 244)).toBe(316);
  });
});
