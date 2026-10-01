import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AppServerClient } from "./appServerClient";
import type { AgentSessionAction } from "./sessionState";
import { errorMessage } from "../../shared/errors";

interface Props {
  threadIdRef: MutableRefObject<string | null>;
  threadOperationRef: MutableRefObject<boolean>;
  ensureActiveThread: () => Promise<{ client: AppServerClient; threadId: string }>;
  ensureConnected: () => Promise<AppServerClient>;
  isThreadRunning: (threadId: string) => boolean;
  dispatch: Dispatch<AgentSessionAction>;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  refreshHistory: () => Promise<unknown>;
}

export class ThreadRevertHistoryError extends Error {
  constructor(detail: string) {
    super(`历史已回退，但显示刷新失败：${detail}。编辑内容已保留，请重新发送。`);
  }
}

export function useThreadRevert(props: Props) {
  const { threadIdRef, threadOperationRef, ensureActiveThread, ensureConnected, isThreadRunning, dispatch, setSubmitting, setError, refreshHistory } = props;
  const revision = useRef(0);
  const expectedNotifications = useRef(new Set<string>());
  const invalidate = useCallback(() => { revision.current += 1; }, []);
  const reset = useCallback(() => {
    revision.current += 1;
    expectedNotifications.current.clear();
  }, []);

  useEffect(() => reset, [reset]);

  const onThreadReverted = useCallback((notification: { threadId: string }) => {
    const threadId = notification.threadId;
    // Core replies before publishing this notification. The originating edit
    // owns hydration; a second read could overwrite its replacement turn.
    if (expectedNotifications.current.delete(threadId)) return;
    if (threadId !== threadIdRef.current) { void refreshHistory(); return; }
    const token = ++revision.current;
    void ensureConnected().then((client) => client.readThreadWithHistory(threadId))
      .then(({ thread }) => {
        if (token === revision.current && threadIdRef.current === threadId) dispatch({ type: "loadThread", thread });
      }).catch((error) => {
        if (token === revision.current && threadIdRef.current === threadId) setError(`回退后的会话同步失败：${errorMessage(error)}`);
      });
  }, [dispatch, ensureConnected, refreshHistory, setError, threadIdRef]);

  const revertLastMessage = useCallback(async (threadId: string, turnId: string) => {
    if (threadIdRef.current !== threadId || threadOperationRef.current || isThreadRunning(threadId)) throw new Error("会话已切换或正在运行，不能编辑历史消息。");
    const token = ++revision.current;
    const assertCurrent = () => {
      if (revision.current !== token || threadIdRef.current !== threadId) throw new Error("会话状态已变化，请重新选择要编辑的消息。");
    };
    threadOperationRef.current = true;
    setSubmitting(true);
    try {
      const { client } = await ensureActiveThread();
      assertCurrent();
      const page = await client.listThreadTurns({ threadId, sortDirection: "desc", limit: 1, itemsView: "full" });
      assertCurrent();
      if (page.data[0]?.id !== turnId || page.data[0].status === "inProgress") throw new Error("只能编辑最后一个已结束回合的用户消息。");
      if (page.data[0].items.filter((item) => item.type === "userMessage").length !== 1) throw new Error("该回合包含追加指令，不能单独替换消息。");
      expectedNotifications.current.add(threadId);
      let response;
      try { response = await client.revertThread({ threadId, beforeTurnId: turnId }); }
      catch (error) { expectedNotifications.current.delete(threadId); throw error; }
      assertCurrent();
      // Apply the committed boundary before fetching display history. A read
      // failure must not leave an already-deleted turn editable in the UI.
      dispatch({ type: "loadThread", thread: response.thread });
      const { thread } = await client.hydrateThreadHistory(response.thread, response.turnsBackwardsCursor).catch((error: unknown) => {
        assertCurrent();
        throw new ThreadRevertHistoryError(errorMessage(error));
      });
      assertCurrent();
      dispatch({ type: "loadThread", thread });
    } finally {
      if (revision.current === token) {
        threadOperationRef.current = false;
        setSubmitting(false);
      }
    }
  }, [dispatch, ensureActiveThread, isThreadRunning, setSubmitting, threadIdRef, threadOperationRef]);

  return { revertLastMessage, onThreadReverted, invalidate, reset };
}
