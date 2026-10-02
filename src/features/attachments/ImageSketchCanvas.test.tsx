// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageSketchCanvas } from "./ImageSketchCanvas";

afterEach(cleanup);

describe("ImageSketchCanvas brush size", () => {
  it("shows the selected brush diameter as the range changes", () => {
    const { container } = render(<ImageSketchCanvas source="" name="草图.png" onCancel={vi.fn()} onSave={vi.fn()} />);
    const slider = screen.getByRole("slider", { name: "笔刷粗细" });
    const marker = container.querySelector<HTMLElement>(".image-sketch-size-marker");

    expect(slider.getAttribute("aria-valuetext")).toBe("6 像素");
    expect(marker?.style.getPropertyValue("--brush-size")).toBe("6px");

    fireEvent.change(slider, { target: { value: "32" } });
    expect(slider.getAttribute("aria-valuetext")).toBe("32 像素");
    expect(marker?.style.getPropertyValue("--brush-size")).toBe("32px");
    expect(marker?.style.top).toBe("162px");
  });
});
