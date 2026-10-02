import type { Thread } from "../../generated/app-server/v2/Thread";
import type { ThreadTurnsListParams } from "../../generated/app-server/v2/ThreadTurnsListParams";
import type { ThreadTurnsListResponse } from "../../generated/app-server/v2/ThreadTurnsListResponse";

type ListTurns = (params: ThreadTurnsListParams) => Promise<ThreadTurnsListResponse>;

/**
 * Reads Core's paginated history without adding a second history format in CS.
 * The server returns newest-first pages; the UI consumes chronological turns.
 */
export async function hydrateThreadHistory(
  listTurns: ListTurns,
  thread: Thread,
  cursor: string | null | undefined,
  limit = 200,
) {
  if (cursor === null) return { thread: { ...thread, turns: [] } };
  const turns: ThreadTurnsListResponse["data"] = [];
  do {
    const page = await listTurns({
      threadId: thread.id,
      cursor: cursor ?? null,
      limit: Math.max(1, Math.min(limit - turns.length, 200)),
      sortDirection: "desc",
      itemsView: "full",
    });
    turns.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor !== null && turns.length < limit);
  return { thread: { ...thread, turns: turns.slice(0, limit).reverse() } };
}
