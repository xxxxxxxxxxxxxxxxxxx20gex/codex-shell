import { describe, expect, it } from "vitest";
import { REVERSE_REQUEST_DISMISSED } from "../runtime/appServerClient";
import { ServerInteractionStore } from "./serverInteractionStore";

describe("ServerInteractionStore", () => {
  function commandApproval(itemId: string) {
    return {
      kind: "commandApproval" as const,
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId,
        startedAtMs: 1,
        approvalId: null,
        environmentId: null,
        reason: null,
        command: "pnpm test",
        cwd: "C:/repo",
        commandActions: [],
        proposedExecpolicyAmendment: null,
        proposedNetworkPolicyAmendments: null,
        networkApprovalContext: null,
      },
    };
  }

  it("queues approvals and resolves the active request", async () => {
    const store = new ServerInteractionStore();
    const result = store.request(1, {
      kind: "commandApproval",
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "item-1",
        startedAtMs: 1,
        approvalId: null,
        environmentId: null,
        reason: null,
        command: "pnpm test",
        cwd: "C:/repo",
        commandActions: [],
        proposedExecpolicyAmendment: null,
        proposedNetworkPolicyAmendments: null,
        networkApprovalContext: null,
      },
    });

    expect(store.getSnapshot()).toHaveLength(1);
    store.approveCurrent("session");
    await expect(result).resolves.toEqual({ decision: "acceptForSession" });
    expect(store.getSnapshot()).toEqual([]);
  });

  it("dismisses a request without writing a stale response", async () => {
    const store = new ServerInteractionStore();
    const result = store.request("request-2", {
      kind: "userInput",
      params: {
        threadId: "thread-1",
        turnId: "turn-1",
        itemId: "item-2",
        questions: [],
        autoResolutionMs: null,
      },
    });

    store.dismiss("request-2");
    await expect(result).resolves.toBe(REVERSE_REQUEST_DISMISSED);
    expect(store.getSnapshot()).toEqual([]);
  });

  it("declines MCP elicitations with the native response shape", async () => {
    const store = new ServerInteractionStore();
    const result = store.request(3, {
      kind: "mcpElicitation",
      params: {
        mode: "url",
        threadId: "thread-1",
        turnId: "turn-1",
        serverName: "github",
        message: "Authorize access",
        url: "https://example.com",
        elicitationId: "elicitation-1",
        _meta: null,
      },
    });

    store.declineCurrent();
    await expect(result).resolves.toEqual({ action: "decline", content: null, _meta: null });
  });

  it("replaces duplicate request ids without leaving a stale resolver", async () => {
    const store = new ServerInteractionStore();
    const first = store.request("same-id", commandApproval("item-1"));
    const second = store.request("same-id", commandApproval("item-2"));

    await expect(first).resolves.toBe(REVERSE_REQUEST_DISMISSED);
    expect(store.getSnapshot()).toMatchObject([{ requestId: "same-id", params: { itemId: "item-2" } }]);
    store.declineCurrent();
    await expect(second).resolves.toEqual({ decision: "decline" });
  });

  it("bounds the queue and declines the oldest interaction", async () => {
    const store = new ServerInteractionStore();
    const pending = Array.from({ length: 33 }, (_, index) => (
      store.request(index, commandApproval(`item-${index}`))
    ));

    await expect(pending[0]).resolves.toEqual({ decision: "decline" });
    expect(store.getSnapshot()).toHaveLength(32);
    expect(store.getSnapshot()[0].requestId).toBe(1);
    store.clear();
    await expect(Promise.all(pending.slice(1))).resolves.toEqual(
      Array.from({ length: 32 }, () => REVERSE_REQUEST_DISMISSED),
    );
  });
});
