// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useThreadHistory } from "./useThreadHistory";
import type { AppServerClient } from "./appServerClient";
import type { Thread } from "../../generated/app-server/v2/Thread";

afterEach(cleanup);

it("preserves names observed during an older list request without hiding future server changes", async () => {
  const old = { id: "t", name: "old", preview: "preview", ephemeral: false } as Thread;
  type Page = { data: Thread[]; nextCursor: string | null };
  let finish!: (page: Page) => void;
  const listThreads = vi.fn(() => new Promise<Page>((resolve) => { finish = resolve; }));
  const dispatch = vi.fn();
  const ensureConnected = async () => ({ listThreads }) as unknown as AppServerClient;
  const currentThreadId = () => "t";
  const { result } = renderHook(() => useThreadHistory({ ensureConnected, dispatch, currentThreadId, enabled: false }));
  act(() => result.current.upsert(old));
  let pending!: Promise<boolean | undefined>;
  await act(async () => { pending = result.current.refresh(); await Promise.resolve(); });
  act(() => result.current.rename("t", "manual name"));
  await act(async () => { finish({ data: [old], nextCursor: null }); await pending; });
  expect(result.current.threads[0].name).toBe("manual name");
  expect(dispatch).toHaveBeenLastCalledWith({ type: "updateThread", thread: { ...old, name: "manual name" } });
  await act(async () => { pending = result.current.refresh(); await Promise.resolve(); });
  await act(async () => { finish({ data: [{ ...old, name: "later server name" }], nextCursor: null }); await pending; });
  expect(result.current.threads[0].name).toBe("later server name");
});
