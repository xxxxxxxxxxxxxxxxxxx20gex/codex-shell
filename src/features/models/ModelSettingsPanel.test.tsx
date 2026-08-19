// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelSettingsPanel } from "./ModelSettingsPanel";

afterEach(cleanup);

const settings = {
  baseUrl: "https://example.test/v1",
  modelId: "custom-model",
  reasoningEffort: "none" as const,
  reasoningSummary: null,
  verbosity: null,
  serviceTier: "default" as const,
};

const loadModels = vi.fn(async () => [{
  id: "custom-model",
  model: "custom-model",
  upgrade: null,
  upgradeInfo: null,
  availabilityNux: null,
  displayName: "Custom model",
  description: "",
  hidden: false,
  supportedReasoningEfforts: [],
  defaultReasoningEffort: "none" as const,
  inputModalities: ["text" as const],
  supportsPersonality: false,
  additionalSpeedTiers: [],
  serviceTiers: [{ id: "priority", name: "Fast", description: "Faster, increased usage" }],
  defaultServiceTier: null,
  isDefault: true,
}]);

describe("ModelSettingsPanel", () => {
  it("keeps the native catalog and manual gateway fallback in one settings surface", () => {
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={loadModels}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("网关与自定义模型")).toBeTruthy();
    expect(screen.getByDisplayValue("custom-model")).toBeTruthy();
    expect(screen.getByText(/仅在模型支持时生效/)).toBeTruthy();
    expect(screen.getByText(/由 Codex Core 管理/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "默认" })).toHaveLength(2);
    expect(screen.queryByText("能力模板")).toBeNull();
  });

  it("requests a runtime restart when the Base URL changes", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={loadModels}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByDisplayValue(settings.baseUrl), {
      target: { value: "https://next.example.test/v1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      baseUrl: "https://next.example.test/v1",
    }), true));
  });

  it("preserves custom reasoning efforts declared by the native catalog", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={loadModels}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByDisplayValue(settings.modelId), { target: { value: "future-model" } });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      modelId: "future-model",
      reasoningEffort: "none",
    })));
  });

  it("normalizes model identifiers and gateway URLs before saving", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={loadModels}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByDisplayValue(settings.baseUrl), {
      target: { value: "  https://next.example.test/v1  " },
    });
    fireEvent.change(screen.getByDisplayValue(settings.modelId), {
      target: { value: "  next-model  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      ...settings,
      baseUrl: "https://next.example.test/v1",
      modelId: "next-model",
    }, true));
  });

  it("saves native reasoning summary and catalog-declared service tier without restarting", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={loadModels}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Fast" })).toBeTruthy());
    fireEvent.click(screen.getAllByRole("button", { name: "详细" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Fast" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      ...settings,
      reasoningSummary: "detailed",
      serviceTier: "priority",
    }));
  });

  it("restarts only when an app-server startup parameter changes", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
        loadModels={loadModels}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "适中" }));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      ...settings,
      verbosity: "medium",
    }, true));
  });

  it("does not persist a service tier that the selected model does not declare", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={{ ...settings, serviceTier: "priority" }}
        loadModels={vi.fn(async () => [{ ...await loadModels().then((items) => items[0]), serviceTiers: [] }])}
        loadProviderCapabilities={vi.fn(async () => ({
          namespaceTools: false,
          imageGeneration: false,
          webSearch: false,
        }))}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "标准" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      ...settings,
      serviceTier: "default",
    }));
  });
});
