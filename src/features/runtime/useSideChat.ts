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
import { agentSessionReducer, initialAgentSessionState } from "./sessionState";
import { errorMessage } from "../../shared/errors";

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

export function useSideChat({
  clientRef,
  ensureConnected,
  mainThread,
  mainTurns,
  settings,
  personalization,
  markThreadRunning,
  markThreadStopped,
}: Props) {
  const [state, dispatch] = useReducer(agentSessionReducer, initialAgentSessionState);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const threadIdRef = useRef<string | null>(null);
  const currentThreadId = useCallback(() => threadIdRef.current, []);
  const operationRef = useRef(false);
  const previousMainThreadIdRef = useRef<string | null>(mainThread?.id ?? null);

  const resetState = useCallback(() => {
    threadIdRef.current = null;
    setSubmitting(false);
    setRunning(false);
    setError("");
    dispatch({ type: "clear" });
  }, []);

  const close = useCallback(async () => {
    const threadId = threadIdRef.current;
    threadIdRef.current = null;
    setOpen(false);
    setSubmitting(false);
    setRunning(false);
    if (threadId) {
      markThreadStopped(threadId);
      try {
        const client = await ensureConnected();
        await client.unsubscribeThread({ threadId });
      } catch {
        // The side chat is ephemeral. A disconnect during close must not
        // surface as a main conversation error.
      }
    }
    dispatch({ type: "clear" });
  }, [ensureConnected, markThreadStopped]);

  const openChat = useCallback(async () => {
    if (operationRef.current) return false;
    if (threadIdRef.current) {
      setOpen(true);
      return true;
    }
    operationRef.current = true;
    // Keep the feature entry disabled while the ephemeral thread is being
    // created. Otherwise the panel can render a Composer before it has a
    // thread id and a first send is silently rejected.
    setSubmitting(true);
    setError("");
    try {
      const client = await ensureConnected();
      const permissions = { approvalPolicy: "never" as const, sandbox: "read-only" as const };
      const response = mainThread && lastForkableTurn(mainTurns)
        ? await client.forkThread({
            threadId: mainThread.id,
            lastTurnId: lastForkableTurn(mainTurns),
            model: settings.modelId,
            serviceTier: settings.serviceTier,
            cwd: String(mainThread.cwd),
            ...permissions,
            developerInstructions: personalization?.customInstructions || null,
            ephemeral: true,
            threadSource: "codex-shell-side-chat",
          })
        : await client.startThread({
            model: settings.modelId,
            serviceTier: settings.serviceTier,
            cwd: mainThread ? String(mainThread.cwd) : null,
            ...permissions,
            developerInstructions: personalization?.customInstructions || null,
            ephemeral: true,
            threadSource: "codex-shell-side-chat",
          });
      threadIdRef.current = response.thread.id;
      // A fork carries the parent turns for model context. They are not new
      // side-chat messages and must not be rendered a second time in the
      // inspector; subsequent notifications populate the isolated timeline.
      dispatch({ type: "loadThread", thread: { ...response.thread, turns: [] } });
      setOpen(true);
      return true;
    } catch (openError) {
      setError(errorMessage(openError));
      return false;
    } finally {
      operationRef.current = false;
      setSubmitting(false);
    }
  }, [ensureConnected, mainThread, mainTurns, personalization?.customInstructions, settings.modelId, settings.serviceTier]);

  const send = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
    images: ImageAttachment[] = [],
  ) => {
    const message = text.trim();
    const threadId = threadIdRef.current;
    if (!threadId || (!message && mentions.length === 0 && images.length === 0) || submitting || running || operationRef.current) return false;
    operationRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const input = buildUserInput(message, mentions, skills, images);
      const client = await ensureConnected();
      const response = await sideTurnStart(client, threadId, input, settings);
      markThreadRunning(threadId, response.turn.id, "regular");
      dispatch({ type: "turnSubmitted", turn: response.turn, userInput: input, submittedAt: Date.now() / 1_000 });
      return true;
    } catch (sendError) {
      setError(errorMessage(sendError));
      return false;
    } finally {
      operationRef.current = false;
      setSubmitting(false);
    }
  }, [ensureConnected, markThreadRunning, running, settings, submitting]);

  const interrupt = useCallback(async () => {
    const threadId = threadIdRef.current;
    if (!threadId || !clientRef.current) return;
    const turn = [...state.turns].reverse().find((item) => item.status === "inProgress");
    if (!turn) return;
    try {
      await clientRef.current.interruptTurn({ threadId, turnId: turn.id });
    } catch (interruptError) {
      setError(errorMessage(interruptError));
    }
  }, [clientRef, state.turns]);

  const onTurnStarted = useCallback((notification: TurnStartedNotification) => {
    if (notification.threadId !== threadIdRef.current) return;
    setSubmitting(false);
    setRunning(true);
    markThreadRunning(notification.threadId, notification.turn.id, "regular");
    dispatch({ type: "turnStarted", turn: notification.turn, startedAt: Date.now() / 1_000 });
  }, [markThreadRunning]);

  const onTurnCompleted = useCallback((notification: TurnCompletedNotification) => {
    if (notification.threadId !== threadIdRef.current) return;
    setSubmitting(false);
    setRunning(false);
    markThreadStopped(notification.threadId);
    dispatch({ type: "turnCompleted", notification, completedAt: Date.now() / 1_000 });
    if (notification.turn.error) setError(notification.turn.error.message);
  }, [markThreadStopped]);

  const onError = useCallback((notification: ErrorNotification) => {
    if (notification.threadId !== threadIdRef.current || notification.willRetry) return;
    setSubmitting(false);
    setRunning(false);
    markThreadStopped(notification.threadId);
    setError(notification.error.message);
  }, [markThreadStopped]);

  useEffect(() => {
    const previous = previousMainThreadIdRef.current;
    const next = mainThread?.id ?? null;
    previousMainThreadIdRef.current = next;
    if (open && previous !== next) void close();
  }, [close, mainThread?.id, open]);

  const subscriptionHandlers = useMemo(() => ({
    currentThreadId,
    dispatch,
    onTurnStarted,
    onTurnCompleted,
    onError,
  }), [currentThreadId, onError, onTurnCompleted, onTurnStarted]);

  return {
    open,
    thread: state.thread,
    turns: state.turns,
    running,
    submitting,
    error,
    tokenUsage: state.tokenUsage,
    diffsByTurnId: state.diffsByTurnId,
    plansByTurnId: state.plansByTurnId,
    activeItemTurnIds: state.activeItemTurnIds,
    mcpProgressByItemId: state.mcpProgressByItemId,
    processEventsByTurnId: state.processEventsByTurnId,
    openChat,
    close,
    send,
    interrupt,
    reset: resetState,
    subscriptionHandlers,
  };
}

export type SideChat = ReturnType<typeof useSideChat>;
