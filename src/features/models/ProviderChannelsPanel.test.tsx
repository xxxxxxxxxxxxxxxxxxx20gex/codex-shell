// @vitest-environment happy-dom

import { invoke } from "@tauri-apps/api/core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderChannelsPanel } from "./ProviderChannelsPanel";
import type { Channel, ProviderSettings } from "./types";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(async () => undefined) }));

const openAiChannel: Channel = {
  id: "openai-1",
  vendor: "openai",
  name: "OpenAI 官方",
  baseUrl: "https://api.openai.com/v1",
  catalog: { kind: "vendorDefault" },
  conversation: { modelId: "gpt-test", reasoningEffort: null, reasoningSummary: null, verbosity: null, serviceTier: "default" },
};

const deepSeekChannel: Channel = {
  id: "deepseek-2",
  vendor: "deepseek",
  name: "DeepSeek 官方",
  baseUrl: "https://api.deepseek.com",
  catalog: { kind: "vendorDefault" },
  conversation: { modelId: "deepseek-flash", reasoningEffort: null, reasoningSummary: null, verbosity: null, serviceTier: "default" },
};

const providerSettings: ProviderSettings = {
  schemaVersion: 2,
  activeChannelId: openAiChannel.id,
  channels: [openAiChannel, deepSeekChannel],
};

function createOnSave() {
  return vi.fn<(settings: ProviderSettings, requiresRestart?: boolean) => Promise<void>>(async () => undefined);
}

function savedSettings(onSave: ReturnType<typeof createOnSave>) {
  return onSave.mock.calls[0][0];
}

beforeEach(() => {
  Object.defineProperty(window, "__TAURI_INTERNALS__", { configurable: true, value: {} });
  vi.mocked(invoke).mockImplementation(async (command: string) => (
    command === "channel_secret_presence" ? ["openai-1"] : undefined
  ));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
});

describe("ProviderChannelsPanel", () => {
  it("groups channels by vendor and reports key presence instead of keys", async () => {
    render(<ProviderChannelsPanel settings={providerSettings} onSave={vi.fn()} />);

    expect(screen.getByText("模型渠道")).toBeTruthy();
    expect(screen.getByText("OpenAI 官方")).toBeTruthy();
    expect(screen.getByText("DeepSeek 官方")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/已保存密钥/)).toBeTruthy());
    expect(screen.getByText(/未保存密钥/)).toBeTruthy();
    expect(vi.mocked(invoke)).toHaveBeenCalledWith("channel_secret_presence");
    expect(vi.mocked(invoke).mock.calls.map(([command]) => command)).toEqual(["channel_secret_presence"]);
  });

  it("adds a channel to its vendor group without activating it", async () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} />);

    fireEvent.click(screen.getAllByRole("button", { name: /新增渠道/ })[1]);
    fireEvent.change(screen.getByPlaceholderText("例如 官方直连、备用中转"), { target: { value: "备用中转" } });
    fireEvent.click(screen.getByRole("button", { name: "保存渠道" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const next = savedSettings(onSave);
    expect(next.activeChannelId).toBe(openAiChannel.id);
    expect(next.channels).toHaveLength(3);
    expect(next.channels[2]).toMatchObject({ vendor: "deepseek", name: "备用中转", baseUrl: "https://api.deepseek.com" });
    expect(next.channels[2].id.startsWith("deepseek-")).toBe(true);
    expect(onSave.mock.calls[0][1]).toBe(false);
  });

  it("stores the API key through the credential command and never reads one back", async () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "编辑 OpenAI 官方" }));
    const keyInput = screen.getByPlaceholderText("保留为空则继续使用已保存的密钥") as HTMLInputElement;
    expect(keyInput.value).toBe("");

    fireEvent.change(keyInput, { target: { value: "  sk-test-only  " } });
    fireEvent.click(screen.getByRole("button", { name: "保存渠道" }));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith("save_channel_secret", {
      channelId: openAiChannel.id,
      secret: "  sk-test-only  ",
    }));
    expect(vi.mocked(invoke).mock.calls.map(([command]) => command)).not.toContain("read_channel_secret");
    expect(savedSettings(onSave).channels[0]).toEqual(openAiChannel);
  });

  it("activates a channel and asks for a core restart", async () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "激活" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(savedSettings(onSave).activeChannelId).toBe(deepSeekChannel.id);
    expect(savedSettings(onSave).channels).toHaveLength(2);
    expect(onSave.mock.calls[0][1]).toBe(true);
  });

  it("requires confirmation before deleting a channel and drops its stored secret", async () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "删除 DeepSeek 官方" }));
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(savedSettings(onSave).channels.map((channel) => channel.id)).toEqual([openAiChannel.id]);
    expect(savedSettings(onSave).activeChannelId).toBe(openAiChannel.id);
    expect(invoke).toHaveBeenCalledWith("save_channel_secret", { channelId: deepSeekChannel.id, secret: null });
  });

  it("reports what the connection test saw", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "channel_secret_presence") return [];
      if (command === "test_channel_connection") {
        return { endpoint: "https://api.deepseek.com/models", status: 200, modelCount: 2, message: "连接正常，模型目录返回 2 个模型。" };
      }
      return undefined;
    });
    render(<ProviderChannelsPanel settings={providerSettings} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "编辑 DeepSeek 官方" }));
    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));

    expect(await screen.findByText("连接正常，模型目录返回 2 个模型。")).toBeTruthy();
    expect(invoke).toHaveBeenCalledWith("test_channel_connection", {
      baseUrl: "https://api.deepseek.com",
      channelId: deepSeekChannel.id,
      secret: null,
    });
  });

  it("surfaces a rejected connection test without leaking the key", async () => {
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === "channel_secret_presence") return [];
      throw new Error("路由可达，但 API Key 被拒绝。");
    });
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: "编辑 OpenAI 官方" }));
    fireEvent.change(screen.getByPlaceholderText("保留为空则继续使用已保存的密钥"), { target: { value: "sk-test-only" } });
    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));

    expect(await screen.findByText(/API Key 被拒绝/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a save that would restart the core while a turn is running", async () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} switchDisabled />);

    fireEvent.click(screen.getByRole("button", { name: "编辑 OpenAI 官方" }));
    fireEvent.change(screen.getByPlaceholderText("保留为空则继续使用已保存的密钥"), { target: { value: "sk-test-only" } });
    fireEvent.click(screen.getByRole("button", { name: "保存渠道" }));

    expect(await screen.findByText(/完成或中断后再修改会重启执行核心的渠道/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalledWith("save_channel_secret", expect.anything());
  });

  it("still allows registering a new channel while a turn is running", async () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} switchDisabled />);

    fireEvent.click(screen.getAllByRole("button", { name: /新增渠道/ })[0]);
    fireEvent.change(screen.getByPlaceholderText("例如 官方直连、备用中转"), { target: { value: "第二条路由" } });
    fireEvent.click(screen.getByRole("button", { name: "保存渠道" }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(savedSettings(onSave).channels).toHaveLength(3);
    expect(onSave.mock.calls[0][1]).toBe(false);
  });

  it("refuses to delete the active channel while a turn is running", async () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} switchDisabled />);

    fireEvent.click(screen.getByRole("button", { name: "删除 OpenAI 官方" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除" }));

    expect(await screen.findByText(/完成或中断后再删除当前生效的渠道/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses to activate another channel while a turn is running", () => {
    const onSave = createOnSave();
    render(<ProviderChannelsPanel settings={providerSettings} onSave={onSave} switchDisabled />);

    const activateButton = screen.getByRole("button", { name: "激活" });
    expect(activateButton.hasAttribute("disabled")).toBe(true);
    fireEvent.click(activateButton);
    expect(onSave).not.toHaveBeenCalled();
  });
});
