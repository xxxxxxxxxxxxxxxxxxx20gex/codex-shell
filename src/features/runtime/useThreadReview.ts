import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { ReviewDelivery } from "../../generated/app-server/v2/ReviewDelivery";
import type { ReviewTarget } from "../../generated/app-server/v2/ReviewTarget";
import type { Thread } from "../../generated/app-server/v2/Thread";
import { errorMessage } from "../../shared/errors";
import { assertModelVisibleInput } from "../../shared/modelVisibleInput";
import type { AppServerClient } from "./appServerClient";
import type { AgentSessionAction } from "./sessionState";

interface Props {
  threadOperationRef: MutableRefObject<boolean>;
  threadIdRef: MutableRefObject<string | null>;
  subscribedThreadIdsRef: MutableRefObject<Set<string>>;
  ensureActiveThread: () => Promise<{ client: AppServerClient; threadId: string }>;
  unsubscribeIfIdle: (threadId: string | null) => Promise<void>;
  dispatch: Dispatch<AgentSessionAction>;
  markThreadRunning: (threadId: string, turnId: string) => void;
  setError: Dispatch<SetStateAction<string>>;
  upsertHistory: (thread: Thread) => void;
}

export function useThreadReview({
  threadOperationRef,
  threadIdRef,
  subscribedThreadIdsRef,
  ensureActiveThread,
  unsubscribeIfIdle,
  dispatch,
  markThreadRunning,
  setError,
  upsertHistory,
}: Props) {
  return useCallback(async (target: ReviewTarget, delivery: ReviewDelivery) => {
    if (threadOperationRef.current) return false;
    threadOperationRef.current = true;
    setError("");
    try {
      if (target.type === "custom") assertModelVisibleInput(target.instructions, "自定义审查要求");
      if (target.type === "baseBranch") assertModelVisibleInput(target.branch, "基础分支");
      if (target.type === "commit") {
        assertModelVisibleInput(target.sha, "Commit SHA");
        if (target.title) assertModelVisibleInput(target.title, "Commit 标题");
      }
      const { client, threadId } = await ensureActiveThread();
      const response = await client.startReview({ threadId, target, delivery });
      markThreadRunning(response.reviewThreadId, response.turn.id);
      if (delivery === "inline") {
        dispatch({ type: "turnStarted", turn: response.turn });
      } else {
        await unsubscribeIfIdle(threadId);
        subscribedThreadIdsRef.current.add(response.reviewThreadId);
        const review = await client.readThread({
          threadId: response.reviewThreadId,
          includeTurns: true,
        });
        threadIdRef.current = response.reviewThreadId;
        dispatch({ type: "loadThread", thread: review.thread });
        upsertHistory(review.thread);
      }
      return true;
    } catch (reviewError) {
      setError(errorMessage(reviewError));
      return false;
    } finally {
      threadOperationRef.current = false;
    }
  }, [
    dispatch,
    ensureActiveThread,
    markThreadRunning,
    setError,
    subscribedThreadIdsRef,
    threadIdRef,
    threadOperationRef,
    unsubscribeIfIdle,
    upsertHistory,
  ]);
}
