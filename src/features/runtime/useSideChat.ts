import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type MutableRefObject } from "react";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { Turn } from "../../generated/app-server/v2/Turn";
import type { TurnCompletedNotification } from "../../generated/app-server/v2/TurnCompletedNotification";
import type { TurnStartedNotification } from "../../generated/app-server/v2/TurnStartedNotification";
import type { ErrorNotification } from "../../generated/app-server/v2/ErrorNotification";
import type { UserInput } from "../../generated/app-server/v2/UserInput";
import type { ModelSettings, PersonalizationSettings } from "../models/types";
import { buildUserInput, type FileMention, type ImageAttachment, type SkillMention } from "./sessionInput";
import type { AppServerClient } from "./appServerClient";
import { agentSessionReducer, initialAgentSessionState, type AgentSessionAction, type AgentSessionState } from "./sessionState";
import { errorMessage } from "../../shared/errors";
import { buildHostInstructions } from "./hostInstructions";

interface Props {
  clientRef: MutableRefObject<AppServerClient | null>;
  ensureConnected: () => Promise<AppServerClient>;
  mainThread: Thread | null;
  mainTurns: Turn[];
  settings: ModelSettings;
  personalization?: PersonalizationSettings;
  markThreadRunning: (threadId: string, turnId: string | null, kind: "regular" | "unknown") => void;
  markThreadStopped: (threadId: string) => void;
}

function lastForkableTurn(turns: Turn[]) {
  return [...turns].reverse().find((turn) => turn.status !== "inProgress")?.id ?? null;
}

async function releaseSideThread(client: AppServerClient | null, threadId: string, turnId?: string) {
  if (client?.connectionStatus !== "ready") return;
  if (turnId) {
    try { await client.interruptTurn({ threadId, turnId }); }
    catch { /* Completion or shutdown may race with interruption. */ }
  }
  try { await client.unsubscribeThread({ threadId }); }
  catch { /* Cleanup must not restart Runtime or affect the main conversation. */ }
}

function sideTurnStart(client: AppServerClient, threadId: string, input: UserInput[], settings: ModelSettings) {
  return client.startTurn({
    threadId,
    input,
    model: settings.modelId,
    effort: settings.reasoningEffort,
    summary: settings.reasoningSummary,
    serviceTier: settings.serviceTier,
    approvalPolicy: "never",
    approvalsReviewer: "user",
    sandboxPolicy: { type: "readOnly", networkAccess: false },
  });
}

const MAX_SIDE_CHATS = 10;

interface SideChatEntry {
  parentId: string | null;
  state: AgentSessionState;
  client: AppServerClient | null;
  submitting: boolean;
  running: boolean;
  error: string;
  draft: string;
  draftVersion: number;
  completedTurnId: string | null;
}

export function useSideChat({
  clientRef, ensureConnected, mainThread, mainTurns, settings, personalization,
  markThreadRunning, markThreadStopped,
}: Props) {
  const entries = useRef(new Map<string | null, SideChatEntry>());
  const parentId = mainThread?.id ?? null;
  const visibleParentId = useRef(parentId);
  visibleParentId.current = parentId;
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [openError, setOpenError] = useState<{ parentId: string | null; message: string } | null>(null);

  // Entry identity fences off replies from closed/reset chats, while switches
  // keep the same entry alive for background events and pending RPCs.
  const isRetained = useCallback((entry: SideChatEntry) => [...entries.current.values()].includes(entry), []);
  const findThread = useCallback((threadId: string) =>
    [...entries.current.values()].find((entry) => entry.state.thread?.id === threadId), []);
  const apply = useCallback((entry: SideChatEntry, action: AgentSessionAction) => {
    entry.state = agentSessionReducer(entry.state, action);
    refresh();
  }, []);

  const release = useCallback(async (entry: SideChatEntry) => {
    const threadId = entry.state.thread?.id;
    if (!threadId) return;
    const turn = [...entry.state.turns].reverse().find((item) => item.status === "inProgress");
    markThreadStopped(threadId);
    await releaseSideThread(entry.client ?? clientRef.current, threadId, turn?.id);
  }, [clientRef, markThreadStopped]);

  const reset = useCallback(() => {
    const previous = [...entries.current.values()];
    entries.current.clear();
    setOpenError(null);
    refresh();
    for (const entry of previous) void release(entry);
  }, [release]);

  const closeForParent = useCallback(async (id: string | null) => {
    const entry = entries.current.get(id);
    entries.current.delete(id);
    setOpenError(error => error?.parentId === id ? null : error);
    refresh();
    if (entry) await release(entry);
  }, [release]);

  const close = useCallback(() => closeForParent(parentId), [closeForParent, parentId]);
  const discardDraft = useCallback(() => { void closeForParent(null); }, [closeForParent]);
  const adoptDraft = useCallback((id: string) => {
    const entry = entries.current.get(null);
    if (!entry) return;
    entries.current.delete(null);
    entry.parentId = id;
    entries.current.set(id, entry);
    setOpenError(null);
    refresh();
  }, []);

  // Opening existing history abandons the unnamed draft; creation explicitly
  // adopts it before publishing the new main thread to React.
  useEffect(() => {
    if (parentId !== null && entries.current.has(null)) discardDraft();
  }, [discardDraft, parentId]);

  const openChat = useCallback(async () => {
    const existing = entries.current.get(parentId);
    if (existing) return Boolean(existing.state.thread);
    if (entries.current.size >= MAX_SIDE_CHATS) {
      setOpenError({ parentId, message: `最多保留 ${MAX_SIDE_CHATS} 个侧聊，请先返回已有会话关闭一个侧聊。` });
      return false;
    }
    const entry: SideChatEntry = {
      parentId, state: initialAgentSessionState, client: null, submitting: true, running: false,
      error: "", draft: "", draftVersion: 0, completedTurnId: null,
    };
    entries.current.set(parentId, entry);
    setOpenError(null);
    refresh();
    try {
      const client = await ensureConnected();
      if (!isRetained(entry)) return false;
      entry.client = client;
      const permissions = { approvalPolicy: "never" as const, sandbox: "read-only" as const };
      const lastTurnId = lastForkableTurn(mainTurns);
      const response = mainThread && lastTurnId
        ? await client.forkThread({
            threadId: mainThread.id, lastTurnId, model: settings.modelId,
            serviceTier: settings.serviceTier, cwd: String(mainThread.cwd), ...permissions,
            developerInstructions: buildHostInstructions(personalization?.customInstructions),
            ephemeral: true, excludeTurns: true, threadSource: "codex-shell-side-chat",
          })
        : await client.startThread({
            model: settings.modelId, serviceTier: settings.serviceTier,
            cwd: mainThread ? String(mainThread.cwd) : null, ...permissions,
            developerInstructions: buildHostInstructions(personalization?.customInstructions),
            ephemeral: true, threadSource: "codex-shell-side-chat",
          });
      if (!isRetained(entry)) {
        await releaseSideThread(client, response.thread.id);
        return false;
      }
      // Inherited parent turns are context, not messages in the side timeline.
      apply(entry, { type: "loadThread", thread: { ...response.thread, turns: [] } });
      return entries.current.get(visibleParentId.current) === entry;
    } catch (error) {
      if (isRetained(entry)) {
        entries.current.delete(entry.parentId);
        setOpenError({ parentId: entry.parentId, message: errorMessage(error) });
      }
      return false;
    } finally {
      if (isRetained(entry)) entry.submitting = false;
      refresh();
    }
  }, [apply, ensureConnected, isRetained, mainThread, mainTurns, parentId, personalization?.customInstructions, settings.modelId, settings.serviceTier]);

  const send = useCallback(async (
    text: string, mentions: FileMention[] = [], skills: SkillMention[] = [], images: ImageAttachment[] = [],
  ) => {
    const entry = entries.current.get(parentId);
    const threadId = entry?.state.thread?.id;
    const message = text.trim();
    if (!entry || !threadId || (!message && mentions.length === 0 && images.length === 0) || entry.submitting || entry.running) return false;
    entry.submitting = true;
    entry.error = "";
    refresh();
    try {
      const input = buildUserInput(message, mentions, skills, images);
      const client = await ensureConnected();
      if (!isRetained(entry)) return false;
      const response = await sideTurnStart(client, threadId, input, settings);
      if (!isRetained(entry)) {
        await releaseSideThread(client, threadId, response.turn.id);
        return false;
      }
      // Completion can arrive before the start response, even in one batch.
      if (entry.completedTurnId !== response.turn.id) {
        markThreadRunning(threadId, response.turn.id, "regular");
        entry.running = true;
        apply(entry, { type: "turnSubmitted", turn: response.turn, userInput: input, submittedAt: Date.now() / 1_000 });
      }
      return true;
    } catch (error) {
      if (isRetained(entry)) entry.error = errorMessage(error);
      return false;
    } finally {
      if (isRetained(entry)) { entry.submitting = false; refresh(); }
    }
  }, [apply, ensureConnected, isRetained, markThreadRunning, parentId, settings]);

  const setDraft = useCallback((draft: string) => {
    const entry = entries.current.get(parentId);
    if (!entry) return;
    entry.draft = draft;
    entry.draftVersion += 1;
    refresh();
  }, [parentId]);

  const sendDraft = useCallback(async () => {
    const entry = entries.current.get(parentId);
    if (!entry) return false;
    const version = entry.draftVersion;
    const sent = await send(entry.draft);
    if (sent && isRetained(entry) && version === entry.draftVersion) {
      entry.draft = "";
      refresh();
    }
    return sent;
  }, [isRetained, parentId, send]);

  const answerQuestions = useCallback(async (text: string) => {
    const entry = entries.current.get(parentId);
    const turn = entry && [...entry.state.turns].reverse().find((item) => item.status === "inProgress");
    if (!turn) return send(text);
    const threadId = entry.state.thread?.id;
    if (!threadId || entry.submitting) return false;
    entry.submitting = true;
    refresh();
    const clientId = crypto.randomUUID();
    try {
      const client = await ensureConnected();
      if (!isRetained(entry)) return false;
      const input = buildUserInput(text, [], [], []);
      apply(entry, { type: "optimisticSteer", threadId, turnId: turn.id, clientId, userInput: input });
      await client.steerTurn({ threadId, expectedTurnId: turn.id, clientUserMessageId: clientId, input });
      return isRetained(entry);
    } catch (error) {
      if (isRetained(entry)) apply(entry, { type: "steerFailed", threadId, clientId });
      throw error;
    } finally {
      if (isRetained(entry)) { entry.submitting = false; refresh(); }
    }
  }, [apply, ensureConnected, isRetained, parentId, send]);

  const interrupt = useCallback(async () => {
    const entry = entries.current.get(parentId);
    const threadId = entry?.state.thread?.id;
    const turn = entry && [...entry.state.turns].reverse().find((item) => item.status === "inProgress");
    if (!entry || !threadId || !turn || !entry.client) return;
    try { await entry.client.interruptTurn({ threadId, turnId: turn.id }); }
    catch (error) { if (isRetained(entry)) { entry.error = errorMessage(error); refresh(); } }
  }, [isRetained, parentId]);

  const onTurnStarted = useCallback((notification: TurnStartedNotification) => {
    const entry = findThread(notification.threadId);
    if (!entry) return;
    entry.running = true;
    markThreadRunning(notification.threadId, notification.turn.id, "regular");
    apply(entry, { type: "turnStarted", turn: notification.turn, startedAt: Date.now() / 1_000 });
  }, [apply, findThread, markThreadRunning]);

  const onTurnCompleted = useCallback((notification: TurnCompletedNotification) => {
    const entry = findThread(notification.threadId);
    if (!entry) return;
    entry.completedTurnId = notification.turn.id;
    entry.running = false;
    markThreadStopped(notification.threadId);
    if (notification.turn.error) entry.error = notification.turn.error.message;
    apply(entry, { type: "turnCompleted", notification, completedAt: Date.now() / 1_000 });
  }, [apply, findThread, markThreadStopped]);

  const onError = useCallback((notification: ErrorNotification) => {
    const entry = findThread(notification.threadId);
    if (!entry || notification.willRetry) return;
    entry.running = false;
    markThreadStopped(notification.threadId);
    entry.error = notification.error.message;
    refresh();
  }, [findThread, markThreadStopped]);

  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => () => resetRef.current(), []);

  const subscriptionHandlers = useMemo(() => ({
    ownsThread: (threadId: string) => Boolean(findThread(threadId)),
    dispatch: (threadId: string, action: AgentSessionAction) => {
      const entry = findThread(threadId);
      if (entry) apply(entry, action);
    },
    onTurnStarted, onTurnCompleted, onError,
  }), [apply, findThread, onError, onTurnCompleted, onTurnStarted]);

  const entry = entries.current.get(parentId);
  const state = entry?.state ?? initialAgentSessionState;
  return {
    thread: state.thread, turns: state.turns,
    running: entry?.running ?? false, submitting: entry?.submitting ?? false,
    anySubmitting: [...entries.current.values()].some((item) => item.submitting),
    error: entry?.error || (openError?.parentId === parentId ? openError.message : ""),
    draft: entry?.draft ?? "", setDraft, sendDraft,
    tokenUsage: state.tokenUsage, diffsByTurnId: state.diffsByTurnId,
    plansByTurnId: state.plansByTurnId, activeItemTurnIds: state.activeItemTurnIds,
    mcpProgressByItemId: state.mcpProgressByItemId, processEventsByTurnId: state.processEventsByTurnId,
    openChat, close, closeForParent, adoptDraft, discardDraft, send, answerQuestions, interrupt, reset, subscriptionHandlers,
  };
}

export type SideChat = ReturnType<typeof useSideChat>;
