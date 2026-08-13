import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ModeKind } from "../../generated/app-server/ModeKind";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { errorMessage } from "../../shared/errors";
import { assertModelVisibleInput } from "../../shared/modelVisibleInput";
import {
  getPermissionMode,
  getTurnSandboxPolicy,
  type PermissionMode,
} from "../approvals/permissionModes";
import type { ModelSettings } from "../models/types";
import type { AppServerClient } from "./appServerClient";
import { buildUserInput, type FileMention, type ImageAttachment, type SkillMention } from "./sessionInput";
import type { AgentSessionAction } from "./sessionState";
import type { QueuedTurnInput } from "./useQueuedTurns";
import { canSteerRunningTurn, type RunningTurn, type RunningTurnKind } from "./useRunningTurns";

interface Props {
  clientRef: MutableRefObject<AppServerClient | null>;
  threadIdRef: MutableRefObject<string | null>;
  threadOperationRef: MutableRefObject<boolean>;
  subscribedThreadIdsRef: MutableRefObject<Set<string>>;
  ensureConnected: () => Promise<AppServerClient>;
  ensureActiveThread: () => Promise<{ client: AppServerClient; threadId: string }>;
  settings: ModelSettings;
  permissionMode: PermissionMode;
  projectCwd: string | null;
  submitting: boolean;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  dispatch: Dispatch<AgentSessionAction>;
  getRunningTurn: (threadId: string) => RunningTurn | undefined;
  isThreadRunning: (threadId: string) => boolean;
  markThreadRunning: (threadId: string, turnId: string | null, kind: RunningTurnKind) => void;
  markThreadStopped: (threadId: string) => void;
  showActiveWith: (thread: Thread) => void;
}

function startTurn(
  client: AppServerClient,
  threadId: string,
  message: string,
  mentions: FileMention[],
  skills: SkillMention[],
  collaborationMode: ModeKind,
  images: ImageAttachment[],
  settings: ModelSettings,
  permissionMode: PermissionMode,
) {
  const permissions = getPermissionMode(permissionMode);
  const collaboration = collaborationMode === "plan" ? {
    mode: collaborationMode,
    settings: {
      model: settings.modelId,
      reasoning_effort: settings.reasoningEffort,
      developer_instructions: null,
    },
  } : undefined;
  return client.startTurn({
    threadId,
    input: buildUserInput(message, mentions, skills, images),
    model: settings.modelId,
    effort: settings.reasoningEffort,
    approvalPolicy: permissions.approvalPolicy,
    approvalsReviewer: permissions.approvalsReviewer,
    sandboxPolicy: getTurnSandboxPolicy(permissionMode),
  }, collaboration);
}

export function useTurnExecution(props: Props) {
  const queuedTurnSendingRef = useRef(new Set<string>());
  const send = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
    collaborationMode: ModeKind = "default",
    images: ImageAttachment[] = [],
  ) => {
    const message = text.trim();
    const activeThreadId = props.threadIdRef.current;
    if (!message || props.submitting || props.threadOperationRef.current
      || (activeThreadId !== null && props.isThreadRunning(activeThreadId))) return false;

    props.threadOperationRef.current = true;
    props.setSubmitting(true);
    props.setError("");
    try {
      assertModelVisibleInput(message, "消息");
      const client = await props.ensureConnected();
      let threadId = props.threadIdRef.current;
      if (!threadId) {
        const permissions = getPermissionMode(props.permissionMode);
        const response = await client.startThread({
          model: props.settings.modelId,
          cwd: props.projectCwd,
          approvalPolicy: permissions.approvalPolicy,
          approvalsReviewer: permissions.approvalsReviewer,
          sandbox: permissions.sandbox,
          ephemeral: false,
        });
        threadId = response.thread.id;
        props.threadIdRef.current = threadId;
        props.subscribedThreadIdsRef.current.add(threadId);
        const optimisticThread = { ...response.thread, preview: response.thread.preview || message };
        props.dispatch({ type: "loadThread", thread: optimisticThread });
        props.showActiveWith(optimisticThread);
      } else if (!props.subscribedThreadIdsRef.current.has(threadId)) {
        await props.ensureActiveThread();
      }

      const response = await startTurn(
        client,
        threadId,
        message,
        mentions,
        skills,
        collaborationMode,
        images,
        props.settings,
        props.permissionMode,
      );
      props.markThreadRunning(threadId, response.turn.id, "regular");
      props.dispatch({ type: "turnSubmitted", turn: response.turn, userText: message });
      return true;
    } catch (sendError) {
      props.setError(errorMessage(sendError));
      return false;
    } finally {
      props.threadOperationRef.current = false;
      props.setSubmitting(false);
    }
  }, [props]);

  const steer = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
    images: ImageAttachment[] = [],
  ) => {
    const message = text.trim();
    const threadId = props.threadIdRef.current;
    const runningTurn = threadId ? props.getRunningTurn(threadId) : undefined;
    if (!message || !threadId || !canSteerRunningTurn(runningTurn)
      || props.threadOperationRef.current) return false;
    props.threadOperationRef.current = true;
    props.setError("");
    try {
      assertModelVisibleInput(message, "补充指令");
      const { client } = await props.ensureActiveThread();
      await client.steerTurn({
        threadId,
        expectedTurnId: runningTurn.turnId,
        input: buildUserInput(message, mentions, skills, images),
      });
      return true;
    } catch (steerError) {
      props.setError(errorMessage(steerError));
      return false;
    } finally {
      props.threadOperationRef.current = false;
    }
  }, [props]);

  const sendQueued = useCallback(async (threadId: string, queued: QueuedTurnInput) => {
    if (queuedTurnSendingRef.current.has(threadId)) return false;
    queuedTurnSendingRef.current.add(threadId);
    if (props.threadIdRef.current === threadId) props.setSubmitting(true);
    props.markThreadRunning(threadId, null, "regular");
    try {
      const client = await props.ensureConnected();
      if (!props.subscribedThreadIdsRef.current.has(threadId)) {
        await client.resumeThread({ threadId });
        props.subscribedThreadIdsRef.current.add(threadId);
      }
      const response = await startTurn(
        client,
        threadId,
        queued.text,
        queued.mentions,
        queued.skills,
        queued.collaborationMode,
        queued.images ?? [],
        queued.settings,
        queued.permissionMode,
      );
      props.markThreadRunning(threadId, response.turn.id, "regular");
      if (props.threadIdRef.current === threadId) {
        props.dispatch({ type: "turnSubmitted", turn: response.turn, userText: queued.text });
      }
      return true;
    } catch (sendError) {
      props.markThreadStopped(threadId);
      if (props.threadIdRef.current === threadId) props.setError(errorMessage(sendError));
      return false;
    } finally {
      queuedTurnSendingRef.current.delete(threadId);
      if (props.threadIdRef.current === threadId) props.setSubmitting(false);
    }
  }, [props]);

  const interrupt = useCallback(async () => {
    const threadId = props.threadIdRef.current;
    const runningTurn = threadId ? props.getRunningTurn(threadId) : undefined;
    if (!threadId || !runningTurn?.turnId || !props.clientRef.current) return;
    try {
      await props.clientRef.current.interruptTurn({ threadId, turnId: runningTurn.turnId });
    } catch (interruptError) {
      props.setError(errorMessage(interruptError));
    }
  }, [props]);

  return { send, sendQueued, steer, interrupt };
}
