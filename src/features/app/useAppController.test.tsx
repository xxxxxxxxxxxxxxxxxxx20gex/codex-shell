// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ProviderSettings } from "../models/types";
import { useAppController } from "./useAppController";

const channelSettings: ProviderSettings = {
  schemaVersion: 2,
  activeChannelId: "openai-1",
  channels: [{
    id: "openai-1",
    vendor: "openai",
    name: "OpenAI 官方",
    baseUrl: "https://api.openai.com/v1",
    catalog: { kind: "vendorDefault" },
    conversation: { modelId: "gpt-test", reasoningEffort: "low", reasoningSummary: null, verbosity: null, serviceTier: "default" },
  }],
};

const session = vi.hoisted(() => ({
  thread: { id: "thread-1", cwd: "C:/work" },
  turns: [{ id: "t", status: "completed", items: [{ type: "userMessage", id: "u" }] }],
  revertLastMessage: vi.fn(async () => {}),
  send: vi.fn(async () => true),
  updateThreadSettings: vi.fn(async () => true),
  getThreadGoal: vi.fn(async () => null),
  acquireProviderSwitch: vi.fn(() => () => {}),
  restart: vi.fn(async () => true),
  listModels: vi.fn(async () => []),
}));
vi.mock("../runtime/useAgentSession", () => ({ useAgentSession: () => session, sendOrQueue: vi.fn() }));
vi.mock("../composer/useComposerDropPaths", () => ({ useComposerDropPaths: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("activates the advanced editor's chosen channel and only closes after restart succeeds", async () => {
  const { result } = renderHook(useAppController);
  const target = { ...channelSettings.channels[0], id: "openai-2", name: "Alternate" };
  act(() => { result.current.setSettings({ ...channelSettings, channels: [...channelSettings.channels, target] }); result.current.setSettingsOpen(true); });
  session.restart.mockResolvedValueOnce(false);
  await act(async () => { await expect(result.current.saveAdvancedModelSettings({ conversation: target.conversation, channelId: target.id, requiresRestart: true })).rejects.toThrow("配置已保存"); });
  expect(result.current.settings.activeChannelId).toBe(target.id);
  expect(result.current.settingsOpen).toBe(true);
  await act(() => result.current.saveAdvancedModelSettings({ conversation: target.conversation, channelId: target.id, requiresRestart: false }));
  expect(result.current.settingsOpen).toBe(false);
  expect(session.restart).toHaveBeenCalledTimes(2);
});

it("opens settings on the requested section and reopens after closing", () => {
  const { result } = renderHook(useAppController);
  act(() => result.current.openPreferences("providers"));
  expect(result.current.preferencesOpen).toBe(true);
  expect(result.current.preferencesSection).toBe("providers");
  act(() => result.current.openPreferences());
  expect(result.current.preferencesOpen).toBe(true);
  expect(result.current.preferencesSection).toBe("personalization");
  act(() => result.current.setPreferencesOpen(false));
  expect(result.current.preferencesOpen).toBe(false);
  act(() => result.current.openPreferences("runtime"));
  expect(result.current.preferencesOpen).toBe(true);
  expect(result.current.preferencesSection).toBe("runtime");
});

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

it.each(["full", "workspace", "read"] as const)("preserves %s permission when switching model and effort", async (mode) => {
  const { result } = renderHook(useAppController);
  act(() => result.current.setSettings(channelSettings));
  act(() => result.current.changePermissionMode(mode));
  session.updateThreadSettings.mockClear();
  await act(() => result.current.changeModelSettings({ ...result.current.conversation, modelId: "other-model", reasoningEffort: "high" }));
  expect(result.current.permissionMode).toBe(mode);
  expect(session.updateThreadSettings).toHaveBeenCalledWith(expect.objectContaining({
    model: "other-model", effort: "high",
    approvalPolicy: mode === "full" ? "never" : "on-request",
    sandboxPolicy: expect.objectContaining({ type: mode === "full" ? "dangerFullAccess" : mode === "workspace" ? "workspaceWrite" : "readOnly" }),
  }));
});
