import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ModeKind } from "../../generated/app-server/ModeKind";
import type { Thread } from "../../generated/app-server/v2/Thread";
import type { UserInput } from "../../generated/app-server/v2/UserInput";
import { errorMessage } from "../../shared/errors";
import { assertModelVisibleInput } from "../../shared/modelVisibleInput";
import {
  getApprovalsReviewer,
  getPermissionMode,
  getTurnSandboxPolicy,
  type ApprovalReviewerMode,
  type PermissionMode,
} from "../approvals/permissionModes";
import type { ModelSettings, PersonalizationSettings } from "../models/types";
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
  personalization?: PersonalizationSettings;
  permissionMode: PermissionMode;
  approvalReviewer: ApprovalReviewerMode;
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
  input: UserInput[],
  collaborationMode: ModeKind,
  settings: ModelSettings,
  permissionMode: PermissionMode,
  approvalReviewer: ApprovalReviewerMode,
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
    input,
    model: settings.modelId,
    effort: settings.reasoningEffort,
    summary: settings.reasoningSummary,
    serviceTier: settings.serviceTier,
    approvalPolicy: permissions.approvalPolicy,
    approvalsReviewer: getApprovalsReviewer(permissionMode, approvalReviewer),
    sandboxPolicy: getTurnSandboxPolicy(permissionMode),
  }, collaboration);
}

function validatedUserInput(
  message: string,
  mentions: FileMention[],
  skills: SkillMention[],
  images: ImageAttachment[],
  label: string,
) {
  const input = buildUserInput(message, mentions, skills, images);
  const text = input[0];
  if (text?.type === "text" && text.text) assertModelVisibleInput(text.text, label);
  return input;
}

export function useTurnExecution(props: Props) {
  const queuedTurnSendingRef = useRef(new Set<string>());
  const send = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
    collaborationMode: ModeKind = "default",
    images: ImageAttachment[] = [],
    goal: string | null = null,
  ) => {
    const message = text.trim();
    const activeThreadId = props.threadIdRef.current;
    if ((!message && mentions.length === 0 && images.length === 0) || props.submitting || props.threadOperationRef.current
      || (activeThreadId !== null && props.isThreadRunning(activeThreadId))) return false;

    props.threadOperationRef.current = true;
    props.setSubmitting(true);
    props.setError("");
    try {
      const input = validatedUserInput(message, mentions, skills, images, "消息和附件路径");
      const client = await props.ensureConnected();
      let threadId = props.threadIdRef.current;
      if (!threadId) {
        const permissions = getPermissionMode(props.permissionMode);
        const response = await client.startThread({
          model: props.settings.modelId,
          cwd: props.projectCwd,
          approvalPolicy: permissions.approvalPolicy,
          approvalsReviewer: getApprovalsReviewer(props.permissionMode, props.approvalReviewer),
          sandbox: permissions.sandbox,
          developerInstructions: props.personalization?.customInstructions || null,
          ephemeral: false,
        });
        threadId = response.thread.id;
        props.threadIdRef.current = threadId;
        props.subscribedThreadIdsRef.current.add(threadId);
        const preview = message || mentions[0]?.name || images[0]?.name || "附件";
        const optimisticThread = { ...response.thread, preview: response.thread.preview || preview };
        props.dispatch({ type: "loadThread", thread: optimisticThread });
        props.showActiveWith(optimisticThread);
      } else if (!props.subscribedThreadIdsRef.current.has(threadId)) {
        await props.ensureActiveThread();
      }

      if (goal?.trim()) {
        const goalResponse = await client.setThreadGoal({
          threadId,
          objective: goal.trim(),
          status: "active",
        });
        props.dispatch({
          type: "threadGoalUpdated",
          notification: { threadId, goal: goalResponse.goal },
        });
      }

      const submittedAt = Date.now() / 1_000;
      const response = await startTurn(
        client,
        threadId,
        input,
        collaborationMode,
        props.settings,
        props.permissionMode,
        props.approvalReviewer,
      );
      props.markThreadRunning(threadId, response.turn.id, "regular");
      props.dispatch({ type: "turnSubmitted", turn: response.turn, userInput: input, submittedAt });
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
    if ((!message && mentions.length === 0 && images.length === 0) || !threadId || !canSteerRunningTurn(runningTurn)
      || props.threadOperationRef.current) return false;
    props.threadOperationRef.current = true;
    props.setError("");
    try {
      const input = validatedUserInput(message, mentions, skills, images, "补充指令和附件路径");
      const { client } = await props.ensureActiveThread();
      await client.steerTurn({
        threadId,
        expectedTurnId: runningTurn.turnId,
        input,
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
        await client.resumeThread({ threadId, excludeTurns: true });
        props.subscribedThreadIdsRef.current.add(threadId);
      }
      const input = validatedUserInput(
        queued.text,
        queued.mentions,
        queued.skills,
        queued.images ?? [],
        "队列消息和附件路径",
      );
      const submittedAt = Date.now() / 1_000;
      const response = await startTurn(
        client,
        threadId,
        input,
        queued.collaborationMode,
        queued.settings,
        queued.permissionMode,
        queued.approvalReviewer,
      );
      props.markThreadRunning(threadId, response.turn.id, "regular");
      if (props.threadIdRef.current === threadId) {
        props.dispatch({ type: "turnSubmitted", turn: response.turn, userInput: input, submittedAt });
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
