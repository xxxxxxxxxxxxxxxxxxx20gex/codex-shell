// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useDismissiblePopover } from "./useDismissiblePopover";

afterEach(cleanup);

function Fixture() {
  const [open, setOpen] = useState(false);
  const rootRef = useDismissiblePopover<HTMLDivElement>({ open, onClose: () => setOpen(false) });
  return <><button type="button" onClick={() => setOpen(true)}>触发</button>{open && <div ref={rootRef}>菜单</div>}<button type="button">外部</button></>;
}

describe("useDismissiblePopover", () => {
  it("closes on outside pointer without stealing focus", () => {
    render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "触发" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "外部" }));
    expect(screen.queryByText("菜单")).toBeNull();
  });

  it("closes on Escape", () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "触发" });
    act(() => trigger.focus());
    act(() => fireEvent.click(trigger));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("菜单")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
