// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { composerSubmitAction, SendModeControl } from "./SendModeControl";

afterEach(cleanup);

function keyEvent(overrides: Partial<Parameters<typeof composerSubmitAction>[0]> = {}) {
  return {
    key: "Enter",
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe("composerSubmitAction", () => {
  it("keeps Enter for Queue and Shift+Enter for a newline", () => {
    expect(composerSubmitAction(keyEvent(), true)).toBe("queue");
    expect(composerSubmitAction(keyEvent({ shiftKey: true }), true)).toBeNull();
  });

  it("reserves Ctrl/Cmd+Shift+Enter for Steer", () => {
    const shortcut = keyEvent({ ctrlKey: true, shiftKey: true });
    expect(composerSubmitAction(shortcut, true)).toBe("steer");
    expect(composerSubmitAction(shortcut, false)).toBe("steerUnavailable");
    expect(composerSubmitAction(keyEvent({ metaKey: true, shiftKey: true }), true)).toBe("steer");
  });
});

describe("SendModeControl", () => {
  it("shows shortcuts and dispatches the selected running-turn action", () => {
    const onQueue = vi.fn();
    const onSteer = vi.fn();
    render(<SendModeControl canSteer hasDraft running onQueue={onQueue} onSteer={onSteer} />);

    expect(screen.getByText("Enter", { selector: "kbd" })).toBeTruthy();
    expect(screen.getByText("Ctrl + Shift + Enter", { selector: "kbd" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: /Steer/ }));
    expect(onSteer).toHaveBeenCalledOnce();
    expect(onQueue).not.toHaveBeenCalled();
  });

  it("disables Steer when the active Turn cannot be guided", () => {
    render(<SendModeControl canSteer={false} hasDraft running onQueue={vi.fn()} onSteer={vi.fn()} />);
    expect(screen.getByRole<HTMLButtonElement>("menuitem", { name: /Steer/ }).disabled).toBe(true);
    expect(screen.getByText("当前阶段不可引导")).toBeTruthy();
  });
});
