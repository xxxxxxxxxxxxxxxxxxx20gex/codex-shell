import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ModeKind } from "../../generated/app-server/ModeKind";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { errorMessage } from "../../shared/errors";
import { assertModelVisibleInput } from "../../shared/modelVisibleInput";
import { getPermissionMode, type PermissionMode } from "../approvals/permissionModes";
import type { ModelSettings } from "../models/types";
import type { AppServerClient } from "./appServerClient";
import { buildUserInput, type FileMention, type SkillMention } from "./sessionInput";
import type { AgentSessionAction } from "./sessionState";
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
  workspacePath: string | null;
  submitting: boolean;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  dispatch: Dispatch<AgentSessionAction>;
  getRunningTurn: (threadId: string) => RunningTurn | undefined;
  isThreadRunning: (threadId: string) => boolean;
  markThreadRunning: (threadId: string, turnId: string | null, kind: RunningTurnKind) => void;
  showActiveWith: (thread: Thread) => void;
}

export function useTurnExecution(props: Props) {
  const send = useCallback(async (
    text: string,
    mentions: FileMention[] = [],
    skills: SkillMention[] = [],
    collaborationMode: ModeKind = "default",
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
          cwd: props.workspacePath,
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

      const input = buildUserInput(message, mentions, skills);
      const permissions = getPermissionMode(props.permissionMode);
      const collaboration = collaborationMode === "plan" ? {
        mode: collaborationMode,
        settings: {
          model: props.settings.modelId,
          reasoning_effort: props.settings.reasoningEffort,
          developer_instructions: null,
        },
      } : undefined;
      const response = await client.startTurn({
        threadId,
        input,
        model: props.settings.modelId,
        effort: props.settings.reasoningEffort,
        approvalPolicy: permissions.approvalPolicy,
        approvalsReviewer: permissions.approvalsReviewer,
        ...(permissions.sandbox === "danger-full-access"
          ? { sandboxPolicy: { type: "dangerFullAccess" as const } }
          : {}),
      }, collaboration);
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
        input: buildUserInput(message, mentions, skills),
      });
      return true;
    } catch (steerError) {
      props.setError(errorMessage(steerError));
      return false;
    } finally {
      props.threadOperationRef.current = false;
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

  return { send, steer, interrupt };
}
