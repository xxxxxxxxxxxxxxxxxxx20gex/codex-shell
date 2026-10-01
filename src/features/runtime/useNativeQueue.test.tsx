// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AppServerClient } from "./appServerClient";
import type { ThreadQueueListResponse } from "../../generated/app-server/v2/ThreadQueueListResponse";
import { useNativeQueue } from "./useNativeQueue";

afterEach(cleanup);
const input = { text: "keep me", mentions: [], skills: [], collaborationMode: "default" as const,
  settings: { modelId: "test", reasoningEffort: null, reasoningSummary: null, verbosity: null, serviceTier: "default" as const },
  permissionMode: "read" as const, approvalReviewer: "user" as const };

function setup() {
  let finishAdd!: () => void;
  let data: ThreadQueueListResponse["data"] = [];
  const client = {
    listQueuedSubmissions: vi.fn(async () => ({ data, nextCursor: null })),
    addQueuedSubmission: vi.fn((params: { clientUserMessageId: string }) => new Promise((resolve) => {
      finishAdd = () => {
        const item = { id: "native", clientUserMessageId: params.clientUserMessageId, input: [{ type: "text" as const, text: input.text, text_elements: [] }] };
        data = [item]; resolve({ queuedSubmission: item });
      };
    })),
    deleteQueuedSubmission: vi.fn(async () => { data = []; return { deleted: true }; }),
    startQueuedSubmission: vi.fn(async () => ({})),
  };
  const setError = vi.fn();
  const hook = renderHook(() => useNativeQueue({ ensureConnected: async () => client as unknown as AppServerClient, defaults: input, setError }));
  return { ...hook, client, setError, finishAdd: () => finishAdd() };
}

it("waits for add acknowledgement before cancelling and keeps pending input across snapshots", async () => {
  const { result, client, finishAdd } = setup();
  await act(async () => { expect(result.current.add("t", input)).toBe(true); });
  const id = result.current.get("t")[0].id;
  await act(async () => { await result.current.refresh("t"); });
  expect(result.current.get("t")).toHaveLength(1);
  let cancel!: Promise<void>;
  act(() => { cancel = result.current.remove("t", id); });
  expect(result.current.get("t")).toHaveLength(1);
  expect(client.deleteQueuedSubmission).not.toHaveBeenCalled();
  await act(async () => { finishAdd(); await cancel; });
  expect(client.deleteQueuedSubmission).toHaveBeenCalledWith({ threadId: "t", queuedSubmissionId: "native" });
  expect(result.current.get("t")).toEqual([]);
});

it("retains the queued input when deletion fails and allows retry", async () => {
  const { result, client, finishAdd } = setup();
  await act(async () => { result.current.add("t", input); });
  await act(async () => { finishAdd(); });
  const id = result.current.get("t")[0].id;
  client.deleteQueuedSubmission.mockRejectedValueOnce(new Error("offline"));
  await act(async () => { await expect(result.current.remove("t", id)).rejects.toThrow("offline"); });
  expect(result.current.get("t")[0].text).toBe(input.text);
  await act(async () => { await result.current.remove("t", id); });
  expect(result.current.get("t")).toEqual([]);
});

it("does not claim successful cancellation when Core reports the item already left the queue", async () => {
  const { result, client, finishAdd } = setup();
  await act(async () => { result.current.add("t", input); });
  await act(async () => { finishAdd(); });
  client.deleteQueuedSubmission.mockResolvedValueOnce({ deleted: false });
  await act(async () => { await expect(result.current.remove("t", result.current.get("t")[0].id)).rejects.toThrow("可能已开始执行"); });
});

it("ignores add responses after reset and never deletes on the new runtime", async () => {
  const { result, client, finishAdd } = setup();
  await act(async () => { result.current.add("t", input); });
  let cancel!: Promise<void>;
  act(() => { cancel = result.current.remove("t", result.current.get("t")[0].id); result.current.clear(); });
  await act(async () => { finishAdd(); await expect(cancel).rejects.toThrow("Runtime 已重置"); });
  expect(result.current.get("t")).toEqual([]);
  expect(client.deleteQueuedSubmission).not.toHaveBeenCalled();
});

it("keeps a failed native start visible and prevents duplicate start requests", async () => {
  const { result, client, finishAdd, setError } = setup();
  await act(async () => { result.current.add("t", input); });
  await act(async () => { finishAdd(); });
  let fail!: (error: Error) => void;
  client.startQueuedSubmission.mockImplementationOnce(() => new Promise((_, reject) => { fail = reject; }));
  let first!: Promise<boolean>;
  act(() => { first = result.current.start("t"); });
  await waitFor(() => expect(client.startQueuedSubmission).toHaveBeenCalledOnce());
  await act(async () => { expect(await result.current.start("t")).toBe(false); fail(new Error("busy")); expect(await first).toBe(false); });
  expect(result.current.get("t")).toHaveLength(1);
  expect(setError).toHaveBeenCalledWith(expect.stringContaining("busy"));
});
