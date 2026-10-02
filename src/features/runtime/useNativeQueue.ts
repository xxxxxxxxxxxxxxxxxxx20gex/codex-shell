import { useCallback, useEffect, useRef } from "react";
import type { AppServerClient } from "./appServerClient";
import { useQueuedTurns, type QueuedTurnInput } from "./useQueuedTurns";
import { buildUserInput } from "./sessionInput";
import { errorMessage } from "../../shared/errors";

interface Props {
  ensureConnected: () => Promise<AppServerClient>;
  setError: (message: string) => void;
  defaults: Pick<QueuedTurnInput, "settings" | "permissionMode" | "approvalReviewer">;
}

export function useNativeQueue({ ensureConnected, setError, defaults }: Props) {
  const { queuedTurns, get, enqueue, setServerId, remove: removeItem, replaceThread, clear: clearStored, clearThread } = useQueuedTurns();
  const { settings, permissionMode, approvalReviewer } = defaults;
  const pendingAdds = useRef(new Map<string, Promise<string>>());
  const pendingDeletes = useRef(new Map<string, Promise<void>>());
  const pendingStarts = useRef(new Set<string>());
  const refreshes = useRef(new Map<string, { dirty: boolean }>());
  const generation = useRef(0);
  const threadGenerations = useRef(new Map<string, number>());
  const threadGeneration = useCallback((threadId: string) => threadGenerations.current.get(threadId) ?? 0, []);
  const invalidateThread = useCallback((threadId: string) => {
    threadGenerations.current.set(threadId, threadGeneration(threadId) + 1);
    clearThread(threadId);
  }, [clearThread, threadGeneration]);
  useEffect(() => () => {
    generation.current += 1;
    threadGenerations.current.clear();
    pendingAdds.current.clear(); pendingDeletes.current.clear(); pendingStarts.current.clear(); refreshes.current.clear();
  }, []);

  const refresh = useCallback(async (threadId: string) => {
    const expectedThreadGeneration = threadGeneration(threadId);
    const pending = refreshes.current.get(threadId);
    if (pending) { pending.dirty = true; return; }
    const operation = { dirty: false };
    refreshes.current.set(threadId, operation);
    try {
      const client = await ensureConnected();
      do {
        if (refreshes.current.get(threadId) !== operation || expectedThreadGeneration !== threadGeneration(threadId)) return;
        operation.dirty = false;
        const response = await client.listQueuedSubmissions({ threadId });
        if (refreshes.current.get(threadId) !== operation || expectedThreadGeneration !== threadGeneration(threadId)) return;
        if (operation.dirty) continue;
        const existing = get(threadId);
        const byId = new Map(existing.map((item) => [item.id, item]));
        const next: QueuedTurnInput[] = response.data.map((item) => {
          const preserved = byId.get(item.clientUserMessageId);
          if (preserved) return { ...preserved, serverId: item.id };
          return {
            id: item.clientUserMessageId, serverId: item.id,
            text: item.input.filter((input) => input.type === "text").map((input) => input.text).join(""),
            mentions: item.input.filter((input) => input.type === "mention").map((input) => ({ name: input.name, path: input.path })),
            skills: item.input.filter((input) => input.type === "skill").map((input) => ({ name: input.name, path: input.path })),
            images: item.input.filter((input) => input.type === "image" || input.type === "localImage").map((input) => ({
              name: input.type === "localImage" ? input.path : "url" in input ? input.url : "托管图片",
              ...(input.type === "localImage" ? { path: input.path } : "url" in input ? { url: input.url } : { fileId: input.fileId }),
            })),
            collaborationMode: "default", settings, permissionMode, approvalReviewer,
          };
        });
        // A snapshot taken before add/delete acknowledgement cannot discard
        // the user's pending operation or report cancellation as complete.
        const ids = new Set(next.map((item) => item.id));
        next.push(...existing.filter((item) => !ids.has(item.id) && (pendingAdds.current.has(item.id) || pendingDeletes.current.has(item.id))));
        replaceThread(threadId, next);
      } while (operation.dirty);
    } finally {
      if (refreshes.current.get(threadId) === operation) refreshes.current.delete(threadId);
    }
  }, [approvalReviewer, ensureConnected, get, permissionMode, replaceThread, settings, threadGeneration]);

  const add = useCallback((threadId: string, input: Omit<QueuedTurnInput, "id">) => {
    const id = `queued-turn-${crypto.randomUUID()}`;
    if (!enqueue(threadId, input, id)) { setError("当前 Session 最多排队 10 条消息"); return false; }
    const epoch = generation.current;
    const threadEpoch = threadGeneration(threadId);
    const promise = ensureConnected().then(async (client) => {
      if (epoch !== generation.current) throw new Error("Runtime 已重置");
      const response = await client.addQueuedSubmission({ threadId, clientUserMessageId: id, input: buildUserInput(input.text, input.mentions, input.skills, input.images ?? []) });
      if (epoch === generation.current && threadEpoch === threadGeneration(threadId)) setServerId(threadId, id, response.queuedSubmission.id);
      return response.queuedSubmission.id;
    });
    pendingAdds.current.set(id, promise);
    void promise.catch((error) => {
      if (epoch === generation.current && threadEpoch === threadGeneration(threadId)) {
        removeItem(threadId, id);
        setError(`消息未能加入 app-server 队列：${errorMessage(error)}`);
      }
    }).finally(() => {
      if (pendingAdds.current.get(id) === promise) {
        pendingAdds.current.delete(id);
        if (epoch === generation.current && threadEpoch === threadGeneration(threadId)) {
          void refresh(threadId).catch((error) => { if (epoch === generation.current && threadEpoch === threadGeneration(threadId)) setError(errorMessage(error)); });
        }
      }
    });
    return true;
  }, [enqueue, ensureConnected, refresh, removeItem, setError, setServerId, threadGeneration]);

  const remove = useCallback((threadId: string, id: string): Promise<void> => {
    const previous = pendingDeletes.current.get(id);
    if (previous) return previous;
    const queued = get(threadId).find((item) => item.id === id);
    if (!queued) return Promise.reject(new Error("消息已离开待发送队列，请检查会话。"));
    const epoch = generation.current;
    const threadEpoch = threadGeneration(threadId);
    const promise = (async () => {
      const serverId = queued.serverId ?? await pendingAdds.current.get(id);
      if (epoch !== generation.current) throw new Error("Runtime 已重置，请重新检查队列。");
      if (threadEpoch !== threadGeneration(threadId)) throw new Error("Session 已关闭，请重新检查队列。");
      if (!serverId) throw new Error("消息尚未完成入队，请稍后重试。");
      const client = await ensureConnected();
      if (epoch !== generation.current) throw new Error("Runtime 已重置，请重新检查队列。");
      if (threadEpoch !== threadGeneration(threadId)) throw new Error("Session 已关闭，请重新检查队列。");
      const response = await client.deleteQueuedSubmission({ threadId, queuedSubmissionId: serverId });
      if (epoch !== generation.current) throw new Error("Runtime 已重置，请重新检查队列。");
      if (threadEpoch !== threadGeneration(threadId)) throw new Error("Session 已关闭，请重新检查队列。");
      if (!response.deleted) throw new Error("消息已离开待发送队列，可能已开始执行，无法撤回。");
      removeItem(threadId, id);
      const activeRefresh = refreshes.current.get(threadId);
      if (activeRefresh) activeRefresh.dirty = true;
    })();
    pendingDeletes.current.set(id, promise);
    void promise.finally(() => {
      if (pendingDeletes.current.get(id) === promise) {
        pendingDeletes.current.delete(id);
        void refresh(threadId).catch((error) => { if (epoch === generation.current) setError(errorMessage(error)); });
      }
    }).catch(() => undefined);
    return promise;
  }, [ensureConnected, get, refresh, removeItem, setError, threadGeneration]);

  const start = useCallback(async (threadId: string) => {
    const next = get(threadId)[0];
    if (!next || pendingDeletes.current.has(next.id) || pendingStarts.current.has(threadId)) return false;
    pendingStarts.current.add(threadId);
    const epoch = generation.current;
    const threadEpoch = threadGeneration(threadId);
    try {
      const serverId = next.serverId ?? await pendingAdds.current.get(next.id);
      if (!serverId || epoch !== generation.current || threadEpoch !== threadGeneration(threadId)) return false;
      const client = await ensureConnected();
      if (epoch !== generation.current || threadEpoch !== threadGeneration(threadId)) return false;
      await client.startQueuedSubmission({ threadId, queuedSubmissionId: serverId });
      if (epoch !== generation.current || threadEpoch !== threadGeneration(threadId)) return false;
      await refresh(threadId);
      return true;
    } catch (error) {
      if (epoch === generation.current) setError(`无法恢复队列消息：${errorMessage(error)}`);
      return false;
    } finally {
      if (epoch === generation.current) pendingStarts.current.delete(threadId);
    }
  }, [ensureConnected, get, refresh, setError, threadGeneration]);

  const clear = useCallback(() => {
    generation.current += 1;
    threadGenerations.current.clear();
    pendingAdds.current.clear(); pendingDeletes.current.clear(); pendingStarts.current.clear(); refreshes.current.clear();
    clearStored();
  }, [clearStored]);
  return { queuedTurns, get, clearThread: invalidateThread, clear, add, remove, start, refresh };
}
