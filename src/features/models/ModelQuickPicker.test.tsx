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
  reasoningSummary: "auto" as const,
  verbosity: "low" as const,
  serviceTier: "default" as const,
};

function model(id: string, serviceTiers: Model["serviceTiers"] = []): Model {
  return {
    id,
    model: id,
    upgrade: null,
    upgradeInfo: null,
    availabilityNux: null,
    displayName: id === "gpt-next" ? "Next Model" : id === "gpt-current" ? "Current Model" : id,
    description: "model",
    modelSpecialty: null,
    hidden: false,
    supportedReasoningEfforts: ["low", "high"].map((reasoningEffort) => ({ reasoningEffort, description: reasoningEffort })),
    defaultReasoningEffort: "low",
    inputModalities: ["text"],
    supportsPersonality: false,
    multiAgentVersion: null,
    additionalSpeedTiers: [],
    serviceTiers,
    defaultServiceTier: null,
    isDefault: false,
  };
}

describe("ModelQuickPicker", () => {
  it("changes the model and reasoning effort without requesting a new Session", async () => {
    const onChange = vi.fn();
    const onDisplayName = vi.fn();
    render(<ModelQuickPicker settings={settings} loadModels={vi.fn(async () => [model("gpt-current"), model("gpt-next")])} onChange={onChange} onDisplayName={onDisplayName} onAdvanced={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "gpt-next" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ modelId: "gpt-next", reasoningEffort: "low" }));
    expect(onDisplayName).toHaveBeenLastCalledWith("gpt-next");
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

  it("resets an unsupported service tier when switching models", async () => {
    const onChange = vi.fn();
    render(<ModelQuickPicker settings={{ ...settings, serviceTier: "priority" }} loadModels={vi.fn(async () => [model("gpt-current", [{ id: "priority", name: "Fast", description: "" }]), model("gpt-6.1-sol")])} onChange={onChange} onDisplayName={vi.fn()} onAdvanced={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "gpt-6.1-sol" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ modelId: "gpt-6.1-sol", serviceTier: "default" }));
  });

  it("preserves a service tier declared by the target model", async () => {
    const onChange = vi.fn();
    render(<ModelQuickPicker settings={{ ...settings, serviceTier: "priority" }} loadModels={vi.fn(async () => [model("gpt-current"), model("gpt-next", [{ id: "priority", name: "Fast", description: "" }])])} onChange={onChange} onDisplayName={vi.fn()} onAdvanced={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "gpt-next" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ modelId: "gpt-next", serviceTier: "priority" }));
  });

  it("hides GPT-5.2 model variants from the desktop picker", async () => {
    render(<ModelQuickPicker
      settings={settings}
      loadModels={vi.fn(async () => [
        model("gpt-current"),
        model("gpt-5.2"),
        model("gpt-5.2-codex"),
        model("gpt-5.20-custom"),
      ])}
      onChange={vi.fn()}
      onDisplayName={vi.fn()}
      onAdvanced={vi.fn()}
      onClose={vi.fn()}
    />);

    expect(await screen.findByRole("button", { name: "gpt-current" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "gpt-5.2" })).toBeNull();
    expect(screen.queryByRole("button", { name: "gpt-5.2-codex" })).toBeNull();
    expect(screen.getByRole("button", { name: "gpt-current" })).toBeTruthy();
  });
});
