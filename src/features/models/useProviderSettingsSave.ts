import { useRef, type Dispatch, type SetStateAction } from "react";
import { flushSync } from "react-dom";
import { invoke } from "@tauri-apps/api/core";
import { errorMessage } from "../../shared/errors";
import type { AgentSession } from "../runtime/useAgentSession";
import { activeChannel, reconcileConversation, replaceChannel } from "./channels";
import type { ChannelSecretChange, ProviderSettings } from "./types";

export function useProviderSettingsSave(
  settings: ProviderSettings,
  setSettings: Dispatch<SetStateAction<ProviderSettings>>,
  session: AgentSession,
  ready: boolean,
  synchronize: (next: ProviderSettings) => Promise<void>,
) {
  const saving = useRef(false);
  const persisted = useRef<ProviderSettings | null>(null);
  const restartRequired = useRef(false);
  const synchronizationRequired = useRef(false);

  async function save(next: ProviderSettings, requiresRestart = false, secretChange?: ChannelSecretChange) {
    if (!ready) throw new Error("模型配置尚未成功读取，请修复配置后重新启动");
    if (saving.current) throw new Error("渠道配置正在保存，请稍后重试");
    const previous = activeChannel(settings);
    const target = activeChannel(next);
    const restart = restartRequired.current || requiresRestart || previous?.id !== target?.id
      || previous?.baseUrl !== target?.baseUrl || previous?.vendor !== target?.vendor
      || previous?.conversation.verbosity !== target?.conversation.verbosity
      || (secretChange !== undefined && secretChange.channelId === target?.id);
    const release = restart ? session.acquireProviderSwitch() : () => {};
    saving.current = true;
    let committed = false;
    try {
      if ("__TAURI_INTERNALS__" in window) {
        await invoke("save_model_settings", { settings: next, expected: persisted.current ?? settings, secretChange });
      }
      persisted.current = next;
      committed = true;
      restartRequired.current = restart;
      synchronizationRequired.current ||= restart || JSON.stringify(previous?.conversation) !== JSON.stringify(target?.conversation);
      // Thread 恢复读取 Hook 参数，必须先提交新渠道的 React 状态。
      flushSync(() => setSettings(next));
      if (restart) {
        if (!await session.restart(Boolean(target))) throw new Error("执行核心重启失败");
        if (target) {
          const reconciled = reconcileConversation(target.conversation, await session.listModels());
          if (reconciled) {
            const calibrated = replaceChannel(next, { ...target, conversation: reconciled });
            if ("__TAURI_INTERNALS__" in window) await invoke("save_model_settings", { settings: calibrated, expected: next });
            next = calibrated;
            persisted.current = next;
            flushSync(() => setSettings(next));
          }
        }
      }
      if (target && synchronizationRequired.current) await synchronize(next);
      flushSync(() => setSettings({ ...next }));
      restartRequired.current = false;
      synchronizationRequired.current = false;
    } catch (error) {
      throw new Error(committed ? `配置已保存，但运行状态同步失败：${errorMessage(error)}。请重试保存。` : errorMessage(error));
    } finally {
      saving.current = false;
      release();
    }
  }

  return { save, saving, persisted };
}
