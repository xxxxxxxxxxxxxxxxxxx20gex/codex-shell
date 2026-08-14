// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComposerIntentControl } from "./ComposerIntentControl";

afterEach(cleanup);

describe("ComposerIntentControl", () => {
  it.each([
    ["plan", "退出计划模式"],
    ["goal", "退出目标模式"],
  ] as const)("renders the active %s intent as one dismissible control", (intent, label) => {
    const onClear = vi.fn();
    render(<ComposerIntentControl intent={intent} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: label }));

    expect(onClear).toHaveBeenCalledOnce();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

