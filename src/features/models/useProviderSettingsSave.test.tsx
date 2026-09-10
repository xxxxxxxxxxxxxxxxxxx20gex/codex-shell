// @vitest-environment happy-dom
import { useState } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import type { AgentSession } from "../runtime/useAgentSession";
import { createChannel } from "./channels";
import type { ProviderSettings } from "./types";
import { useProviderSettingsSave } from "./useProviderSettingsSave";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => undefined) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); Reflect.deleteProperty(window, "__TAURI_INTERNALS__"); });

function setup(ready = true) {
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
  const channels = [createChannel("openai", []), createChannel("deepseek", [])];
  channels[1].conversation.modelId = "custom-id";
  const initial: ProviderSettings = { schemaVersion: 2, channels, activeChannelId: channels[0].id };
  const next = { ...initial, activeChannelId: channels[1].id };
  const release = vi.fn();
  const session = { acquireProviderSwitch: vi.fn(() => release), restart: vi.fn(async () => true), listModels: vi.fn(async () => []) };
  const synchronize = vi.fn(async () => {});
  const hook = renderHook(() => {
    const [settings, setSettings] = useState(initial);
    return { settings, ...useProviderSettingsSave(settings, setSettings, session as unknown as AgentSession, ready, synchronize) };
  });
  return { ...hook, initial, next, session, release, synchronize };
}

it("commits active identity before restart and waits for catalog and synchronization", async () => {
  const { result, next, session, release, synchronize } = setup();
  let finish!: () => void;
  session.listModels.mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve([]); }));
  session.restart.mockImplementationOnce(async () => { expect(result.current.settings.activeChannelId).toBe(next.activeChannelId); return true; });
  let save!: Promise<void>;
  await act(async () => { save = result.current.save(next); await Promise.resolve(); });
  expect(release).not.toHaveBeenCalled();
  await expect(result.current.save(next)).rejects.toThrow("正在保存");
  await act(async () => { finish(); await save; });
  expect(synchronize).toHaveBeenCalledWith(next);
  expect(release).toHaveBeenCalledOnce();
});

it("keeps committed settings and retries failed restarts even without another edit", async () => {
  const { result, next, session, release } = setup();
  session.restart.mockResolvedValueOnce(false);
  await act(async () => { await expect(result.current.save(next)).rejects.toThrow("配置已保存"); });
  expect(result.current.settings).toEqual(next);
  expect(release).toHaveBeenCalledOnce();
  await act(() => result.current.save(next));
  expect(session.restart).toHaveBeenCalledTimes(2);
});

it("does not commit if background tasks prevent acquiring the switch", async () => {
  const { result, next, session } = setup();
  session.acquireProviderSwitch.mockImplementationOnce(() => { throw new Error("后台任务运行中"); });
  await expect(result.current.save(next)).rejects.toThrow("后台任务");
  expect(invoke).not.toHaveBeenCalled();
  expect(session.restart).not.toHaveBeenCalled();
});

it("forwards credentials with config and preserves state on failed persistence", async () => {
  const { result, initial, next, release } = setup();
  vi.mocked(invoke).mockRejectedValueOnce(new Error("config failed"));
  const secretChange = { channelId: next.activeChannelId, secret: "test-only-key" };
  await act(async () => { await expect(result.current.save(next, true, secretChange)).rejects.toThrow("config failed"); });
  expect(result.current.settings).toEqual(initial);
  expect(invoke).toHaveBeenCalledWith("save_model_settings", { settings: next, expected: initial, secretChange });
  expect(release).toHaveBeenCalledOnce();
});

it("does not restart for inactive channel credentials and refuses unloaded configuration", async () => {
  const { result, initial, next, session } = setup();
  await act(() => result.current.save(initial, false, { channelId: next.activeChannelId, secret: "test-only-key" }));
  expect(session.restart).not.toHaveBeenCalled();
  const unloaded = setup(false);
  await expect(unloaded.result.current.save(unloaded.next)).rejects.toThrow("尚未成功读取");
});
