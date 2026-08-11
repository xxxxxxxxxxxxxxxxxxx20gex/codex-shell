// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppServerClient } from "./appServerClient";
import { FakeTransport } from "./appServerClientTestSupport";
import { useWorkspaceFiles } from "./useWorkspaceFiles";

describe("useWorkspaceFiles", () => {
  it("filters fs/changed by watch id and unregisters both sides", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();
    const onChanged = vi.fn();
    const { result } = renderHook(() => useWorkspaceFiles(async () => client, "C:\\work"));

    let disposePromise: ReturnType<typeof result.current.watchWorkspacePath>;
    act(() => {
      disposePromise = result.current.watchWorkspacePath("C:\\work", onChanged);
    });
    await vi.waitFor(() => expect(transport.sent.some((message) => message.method === "fs/watch")).toBe(true));
    const watchRequest = [...transport.sent].reverse().find((message) => message.method === "fs/watch")!;
    const watchId = (watchRequest.params as { watchId: string }).watchId;
    transport.emit({ id: watchRequest.id, result: { path: "C:\\work" } });
    const dispose = await disposePromise!;

    transport.emit({ method: "fs/changed", params: { watchId: "other", changedPaths: ["C:\\other"] } });
    transport.emit({ method: "fs/changed", params: { watchId, changedPaths: ["C:\\work\\a.ts"] } });
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalledWith(["C:\\work\\a.ts"]);

    const disposing = dispose();
    const unwatchRequest = transport.sent[transport.sent.length - 1];
    expect(unwatchRequest).toMatchObject({ method: "fs/unwatch", params: { watchId } });
    transport.emit({ id: unwatchRequest.id, result: {} });
    await disposing;

    transport.emit({ method: "fs/changed", params: { watchId, changedPaths: ["C:\\work\\b.ts"] } });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
