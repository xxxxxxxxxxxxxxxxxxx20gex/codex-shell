// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAppController } from "./useAppController";

const session = vi.hoisted(() => ({
  thread: { id: "thread-1", cwd: "C:/work" },
  turns: [{ id: "t", status: "completed", items: [{ type: "userMessage", id: "u" }] }],
  revertLastMessage: vi.fn(async () => {}),
  send: vi.fn(async () => true),
  updateThreadSettings: vi.fn(async () => true),
  getThreadGoal: vi.fn(async () => null),
}));
vi.mock("../runtime/useAgentSession", () => ({ useAgentSession: () => session, sendOrQueue: vi.fn() }));
vi.mock("../composer/useComposerDropPaths", () => ({ useComposerDropPaths: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("restores a message without overwriting an existing draft", () => {
  const { result } = renderHook(useAppController);
  const message = { type: "userMessage" as const, id: "u", clientId: null, content: [{ type: "text" as const, text: "original", text_elements: [] }] };
  act(() => result.current.editLastMessage(message));
  expect(result.current.draft).toBe("original");
  act(() => result.current.setDraft("new draft"));
  act(() => result.current.editLastMessage(message));
  expect(result.current.draft).toBe("new draft");
  expect(result.current.uiError).toContain("草稿");
});

it("reverts before resending and cancels without changing history", async () => {
  const { result } = renderHook(useAppController);
  const message = { type: "userMessage" as const, id: "u", clientId: null, content: [{ type: "text" as const, text: "original", text_elements: [] }] };
  act(() => result.current.editLastMessage(message));
  act(() => result.current.cancelMessageEdit());
  expect(session.revertLastMessage).not.toHaveBeenCalled();
  act(() => result.current.editLastMessage(message));
  act(() => result.current.setDraft("edited"));
  await act(() => result.current.submitWithMode("queue"));
  expect(session.revertLastMessage).toHaveBeenCalledWith("thread-1", "t");
  expect(session.send.mock.invocationCallOrder[0]).toBeGreaterThan(session.revertLastMessage.mock.invocationCallOrder[0]);
  expect(result.current.draft).toBe("");
});

it("keeps the edit draft when history revert fails", async () => {
  session.revertLastMessage.mockRejectedValueOnce(new Error("revert failed"));
  const { result } = renderHook(useAppController);
  act(() => result.current.editLastMessage({ type: "userMessage", id: "u", clientId: null, content: [{ type: "text", text: "keep", text_elements: [] }] }));
  await act(() => result.current.submitWithMode("queue"));
  expect(session.send).not.toHaveBeenCalled();
  expect(result.current.draft).toBe("keep");
  expect(result.current.editingMessage).not.toBeNull();
});

it.each(["full", "workspace", "read"] as const)("preserves %s permission when switching model and effort", (mode) => {
  const { result } = renderHook(useAppController);
  act(() => result.current.changePermissionMode(mode));
  session.updateThreadSettings.mockClear();
  act(() => result.current.changeModelSettings({ ...result.current.settings, modelId: "other-model", reasoningEffort: "high" }));
  expect(result.current.permissionMode).toBe(mode);
  expect(session.updateThreadSettings).toHaveBeenCalledWith(expect.objectContaining({
    model: "other-model", effort: "high",
    approvalPolicy: mode === "full" ? "never" : "on-request",
    sandboxPolicy: expect.objectContaining({ type: mode === "full" ? "dangerFullAccess" : mode === "workspace" ? "workspaceWrite" : "readOnly" }),
  }));
});
