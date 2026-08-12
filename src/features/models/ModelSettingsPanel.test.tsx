// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ModelSettingsPanel } from "./ModelSettingsPanel";

afterEach(cleanup);

const settings = {
  baseUrl: "https://example.test/v1",
  modelId: "custom-model",
  reasoningEffort: "none" as const,
  verbosity: "low" as const,
};

describe("ModelSettingsPanel", () => {
  it("keeps the native catalog and manual gateway fallback in one settings surface", () => {
    render(
      <ModelSettingsPanel
        settings={settings}
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
    expect(screen.queryByText("能力模板")).toBeNull();
  });

  it("requests a runtime restart when the Base URL changes", async () => {
    const onSave = vi.fn();
    render(
      <ModelSettingsPanel
        settings={settings}
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
});
