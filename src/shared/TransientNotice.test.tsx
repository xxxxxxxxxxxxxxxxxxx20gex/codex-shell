// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransientNotice } from "./TransientNotice";

describe("TransientNotice", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it("can be dismissed explicitly", () => {
    const onDismiss = vi.fn();
    render(<TransientNotice message="Diff 无法预览" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "关闭提示" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses itself after the timeout", () => {
    const onDismiss = vi.fn();
    render(<TransientNotice message="Diff 无法预览" onDismiss={onDismiss} timeoutMs={5000} />);

    act(() => vi.advanceTimersByTime(4999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
