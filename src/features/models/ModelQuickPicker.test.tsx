// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Model } from "../../generated/app-server/v2/Model";
import { ModelQuickPicker } from "./ModelQuickPicker";

afterEach(cleanup);

const settings = {
  baseUrl: "https://example.test/v1",
  modelId: "gpt-current",
  reasoningEffort: "medium" as const,
  verbosity: "low" as const,
};

function model(id: string): Model {
  return {
    id,
    model: id,
    upgrade: null,
    upgradeInfo: null,
    availabilityNux: null,
    displayName: id === "gpt-next" ? "Next Model" : "Current Model",
    description: "model",
    hidden: false,
    supportedReasoningEfforts: ["low", "high"].map((reasoningEffort) => ({ reasoningEffort, description: reasoningEffort })),
    defaultReasoningEffort: "low",
    inputModalities: ["text"],
    supportsPersonality: false,
    additionalSpeedTiers: [],
    serviceTiers: [],
    defaultServiceTier: null,
    isDefault: false,
  };
}

describe("ModelQuickPicker", () => {
  it("changes the model and reasoning effort without requesting a new Session", async () => {
    const onChange = vi.fn();
    const onDisplayName = vi.fn();
    render(<ModelQuickPicker settings={settings} loadModels={vi.fn(async () => [model("gpt-current"), model("gpt-next")])} onChange={onChange} onDisplayName={onDisplayName} onAdvanced={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Next Model" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ modelId: "gpt-next", reasoningEffort: "low" }));
    expect(onDisplayName).toHaveBeenLastCalledWith("Next Model");
    expect(screen.getByRole("dialog").querySelectorAll(".chevron-icon").length).toBe(0);

    expect(screen.getByRole("button", { name: /高级设置/ })).toBeTruthy();
    expect(screen.queryByText("能力模板")).toBeNull();
  });

  it("exposes the native reasoning efforts for the selected model", async () => {
    const onChange = vi.fn();
    render(<ModelQuickPicker settings={{ ...settings, modelId: "gpt-current", reasoningEffort: "low" }} loadModels={vi.fn(async () => [model("gpt-current")])} onChange={onChange} onDisplayName={vi.fn()} onAdvanced={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "high" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ modelId: "gpt-current", reasoningEffort: "high" }));
  });
});
