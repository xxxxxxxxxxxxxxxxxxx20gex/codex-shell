// @vitest-environment happy-dom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { subscribeToSessionEvents } from "./sessionSubscriptions";
import { useAgentSession } from "./useAgentSession";
import { RuntimeNoticeBanner } from "./RuntimeNoticeBanner";
import { RuntimeNoticeList } from "./RuntimeNoticeList";
import type { ModelSettings } from "../models/types";

vi.mock("./sessionSubscriptions", () => ({ subscribeToSessionEvents: vi.fn(() => () => {}) }));
const settings: ModelSettings = {
  modelId: "gpt-6.1-sol", reasoningEffort: "low", reasoningSummary: null,
  verbosity: null, serviceTier: "default",
};
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

function setup() {
  const { result } = renderHook(() => useAgentSession(settings, "full", "user", null, undefined, false));
  const handlers = () => vi.mocked(subscribeToSessionEvents).mock.lastCall![1];
  const buffer = (threadId: string, turnId: string, showBufferingUi = true) => act(() => {
    handlers().onModelSafetyBuffering({ threadId, turnId, showBufferingUi,
      model: settings.modelId, useCases: [], reasons: [], fasterModel: null });
  });
  return { store: result.current.runtimeNoticeStore, handlers, buffer };
}

it("keeps buffering visible until its matching clear event, isolating threads and turns", () => {
  vi.useFakeTimers();
  const { store, buffer } = setup();
  buffer("main", "one");
  buffer("side", "one");
  buffer("main", "two");
  act(() => vi.advanceTimersByTime(30_000));
  expect(store.getSnapshot()).toHaveLength(3);
  buffer("main", "one", false);
  expect(store.getSnapshot().map(({ threadId, turnId }) => [threadId, turnId]))
    .toEqual([["side", "one"], ["main", "two"]]);
  buffer("main", "two");
  expect(store.getSnapshot()).toHaveLength(2);
});

it("clears buffering on completion, terminal errors, closure and runtime stop", () => {
  const { store, handlers, buffer } = setup();
  buffer("main", "one");
  buffer("side", "two");
  act(() => handlers().onTurnCompleted({ threadId: "main", turn: {
    id: "one", status: "completed", items: [], itemsView: "full", error: null,
    startedAt: null, completedAt: null, durationMs: null,
  } }));
  expect(store.getSnapshot().map((notice) => notice.threadId)).toEqual(["side"]);
  const error = { threadId: "side", turnId: "two", willRetry: true,
    error: { message: "retry", codexErrorInfo: null, additionalDetails: null, misalignment: null } };
  act(() => handlers().onError(error));
  expect(store.getSnapshot()).toHaveLength(1);
  act(() => handlers().onError({ ...error, willRetry: false }));
  expect(store.getSnapshot()).toEqual([]);
  buffer("side", "three");
  act(() => handlers().onThreadClosed({ threadId: "side" }));
  expect(store.getSnapshot()).toEqual([]);
  buffer("main", "four");
  act(() => handlers().onStopped());
  expect(store.getSnapshot()).toEqual([]);
});

it("shows only the active thread's model notices in the banner and identifies diagnostic sources", () => {
  const { store, handlers, buffer } = setup();
  act(() => handlers().onModelVerification({ threadId: "main", turnId: "one", verifications: [] }));
  buffer("side", "two");
  const view = render(<RuntimeNoticeBanner store={store} threadId="main" onShowStatus={vi.fn()} />);
  expect(screen.getByText("模型需要额外验证")).toBeTruthy();
  expect(screen.queryByText("模型响应正在安全缓冲")).toBeNull();
  view.rerender(<RuntimeNoticeBanner store={store} threadId="side" onShowStatus={vi.fn()} />);
  expect(screen.queryByText("模型需要额外验证")).toBeNull();
  expect(screen.getByText("模型响应正在安全缓冲")).toBeTruthy();
  view.rerender(<RuntimeNoticeBanner store={store} onShowStatus={vi.fn()} />);
  expect(view.container.textContent).toBe("");
  act(() => {
    for (const threadId of ["main", "side"]) handlers().onModelRerouted({
      threadId, turnId: "rerouted", fromModel: "a", toModel: "b", reason: "highRiskCyberActivity",
    });
  });
  expect(store.getSnapshot().filter((notice) => notice.title === "模型已被重新路由")).toHaveLength(2);
  expect(view.container.textContent).toBe("");
  view.rerender(<RuntimeNoticeList store={store} />);
  expect(screen.getByText("会话：side · 回合：two")).toBeTruthy();
});
