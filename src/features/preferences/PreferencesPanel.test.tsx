// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PreferencesPanel } from "./PreferencesPanel";

afterEach(cleanup);

describe("PreferencesPanel", () => {
  it("keeps general settings limited to personalization and appearance", async () => {
    const onSave = vi.fn(async () => undefined);
    render(<PreferencesPanel
      settings={{ customInstructions: "", theme: "dark" }}
      onClose={() => undefined}
      onSave={onSave}
    />);

    expect(screen.getByRole("button", { name: "个性化提示词" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "外观" })).toBeTruthy();
    expect(screen.queryByText("Base URL")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/回答时优先给出结论/), {
      target: { value: "  先给结论  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({
      customInstructions: "先给结论",
      theme: "dark",
    }));
  });

  it("switches appearance without mixing model settings into the page", () => {
    render(<PreferencesPanel
      settings={{ customInstructions: "", theme: "dark" }}
      onClose={() => undefined}
      onSave={async () => undefined}
    />);

    fireEvent.click(screen.getByRole("button", { name: "外观" }));
    fireEvent.click(screen.getByRole("radio", { name: /浅色/ }));
    expect(screen.getByRole("radio", { name: /浅色/ }).getAttribute("aria-checked")).toBe("true");
  });
});
