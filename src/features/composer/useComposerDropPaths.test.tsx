// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useComposerDropPaths } from "./useComposerDropPaths";

vi.mock("@tauri-apps/api/webview", () => ({ getCurrentWebview: vi.fn() }));

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
  vi.restoreAllMocks();
});

function Fixture({ onDropPaths = vi.fn(), onError = vi.fn() }) {
  const composerRef = createRef<HTMLDivElement>();
  useComposerDropPaths(composerRef, onDropPaths, onError);
  return <div ref={composerRef}>Composer</div>;
}

describe("useComposerDropPaths", () => {
  it("forwards dropped paths only when the scaled pointer hits the composer", async () => {
    Object.assign(window, { __TAURI_INTERNALS__: {} });
    const onDropPaths = vi.fn();
    let handleDrop: ((event: {
      payload: { type: "drop"; paths: string[]; position: { x: number; y: number } };
    }) => void) | undefined;
    const onDragDropEvent = vi.fn(async (handler: typeof handleDrop) => {
      handleDrop = handler;
      return vi.fn();
    });
    vi.mocked(getCurrentWebview).mockReturnValue({ onDragDropEvent } as never);
    vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(2);
    const elementFromPoint = vi.spyOn(document, "elementFromPoint");

    const view = render(<Fixture onDropPaths={onDropPaths} />);
    await vi.waitFor(() => expect(handleDrop).toBeTypeOf("function"));
    elementFromPoint.mockReturnValue(view.getByText("Composer"));
    handleDrop?.({
      payload: { type: "drop", paths: ["C:\\work\\App.tsx"], position: { x: 80, y: 40 } },
    });

    expect(elementFromPoint).toHaveBeenCalledWith(40, 20);
    expect(onDropPaths).toHaveBeenCalledWith(["C:\\work\\App.tsx"]);

    elementFromPoint.mockReturnValue(document.body);
    handleDrop?.({
      payload: { type: "drop", paths: ["C:\\outside.txt"], position: { x: 20, y: 10 } },
    });
    expect(onDropPaths).toHaveBeenCalledOnce();
  });

  it("releases a listener that finishes registering after unmount", async () => {
    Object.assign(window, { __TAURI_INTERNALS__: {} });
    const unlisten = vi.fn();
    let finishRegistration: ((cleanup: () => void) => void) | undefined;
    const onDragDropEvent = vi.fn(() => new Promise<() => void>((resolve) => {
      finishRegistration = resolve;
    }));
    vi.mocked(getCurrentWebview).mockReturnValue({ onDragDropEvent } as never);

    const view = render(<Fixture />);
    view.unmount();
    finishRegistration?.(unlisten);

    await vi.waitFor(() => expect(unlisten).toHaveBeenCalledOnce());
  });

  it("reports listener registration failures while mounted", async () => {
    Object.assign(window, { __TAURI_INTERNALS__: {} });
    const onError = vi.fn();
    vi.mocked(getCurrentWebview).mockReturnValue({
      onDragDropEvent: vi.fn(async () => { throw new Error("drag listener failed"); }),
    } as never);

    render(<Fixture onError={onError} />);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("drag listener failed"));
  });
});
