import type { ModelSettings } from "../models/types";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { Turn } from "../../generated/app-server/v2/Turn";

export const settings: ModelSettings = {
  modelId: "gpt-test",
  reasoningEffort: "medium",
  reasoningSummary: "auto",
  verbosity: "medium",
  serviceTier: "default",
};

export function fakeThread(): Thread {
  return {
    id: "side-thread",
    environments: null,
    sessionId: "session",
    forkedFromId: null,
    parentThreadId: null,
    preview: "",
    ephemeral: true,
    section: null,
    sectionEnteredAt: null,
    projectId: null,
    historyMode: "legacy",
    extra: null,
    model: null,
    reasoningEffort: null,
    canAcceptDirectInput: null,
    modelProvider: "openai",
    createdAt: 0,
    updatedAt: 0,
    recencyAt: null,
    status: { type: "idle" },
    path: null,
    cwd: "C:\\work",
    cliVersion: "test",
    originator: null,
    source: "appServer",
    threadSource: "codex-shell-side-chat",
    agentNickname: null,
    agentRole: null,
    gitInfo: null,
    name: null,
    daybreakEnabled: null,
    turns: [],
  };
}

export function fakeTurn(status: Turn["status"]): Turn {
  return {
    id: "turn-1",
    items: [],
    itemsView: "full",
    status,
    error: null,
    startedAt: 1,
    completedAt: null,
    durationMs: null,
  };
}
