// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAppController } from "./useAppController";

const session = vi.hoisted(() => ({
  thread: { id: "thread-1", cwd: "C:/work" },
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
