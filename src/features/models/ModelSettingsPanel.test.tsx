// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Model } from "../../generated/app-server/v2/Model";
import { ModelSettingsPanel } from "./ModelSettingsPanel";

afterEach(cleanup);

const settings = {
  baseUrl: "https://example.test/v1",
  modelId: "custom-model",
  capabilityTemplate: "openai-compatible-basic",
  reasoningEffort: "none" as const,
  verbosity: "low" as const,
};

function model(id: string, hidden = false): Model {
  return {
    id,
    model: id,
    upgrade: null,
    upgradeInfo: null,
    availabilityNux: null,
    displayName: id.toUpperCase(),
    description: `${id} description`,
    hidden,
    supportedReasoningEfforts: [{ reasoningEffort: "high", description: "High" }],
    defaultReasoningEffort: "high",
    inputModalities: ["text"],
    supportsPersonality: false,
    additionalSpeedTiers: [],
    serviceTiers: [],
    defaultServiceTier: null,
    isDefault: false,
  };
}

describe("ModelSettingsPanel", () => {
  it("keeps the native catalog and manual gateway fallback in one settings surface", () => {
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={vi.fn(async () => [])}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("app-server 原生模型目录")).toBeTruthy();
    expect(screen.getByDisplayValue("custom-model")).toBeTruthy();
    expect(screen.getByText("能力模板")).toBeTruthy();
  });

  it("loads visible native models and saves their declared reasoning effort", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={vi.fn(async () => [model("native-model"), model("hidden-model", true)])}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: true,
          imageGeneration: false,
          webSearch: true,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const catalog = await screen.findByRole("combobox");
    expect(screen.queryByText(/HIDDEN-MODEL/)).toBeNull();
    fireEvent.change(catalog, { target: { value: "native-model" } });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      modelId: "native-model",
      reasoningEffort: "high",
    })));
  });

  it("preserves custom reasoning efforts declared by the native catalog", async () => {
    const onSave = vi.fn();
    const customModel = {
      ...model("future-model"),
      supportedReasoningEfforts: [{ reasoningEffort: "adaptive-v2", description: "Adaptive" }],
      defaultReasoningEffort: "adaptive-v2",
    };
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={vi.fn(async () => [customModel])}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(await screen.findByRole("combobox"), { target: { value: "future-model" } });
    expect(screen.getByRole("button", { name: "adaptive-v2" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      modelId: "future-model",
      reasoningEffort: "adaptive-v2",
    })));
  });
});
