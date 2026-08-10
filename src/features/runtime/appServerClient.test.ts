import { describe, expect, it, vi } from "vitest";
import type { AppServerTransport, DisposeListener } from "./appServerTransport";
import { AppServerClient } from "./appServerClient";
import { subscribeToSessionEvents } from "./sessionSubscriptions";
import type { AgentSessionAction } from "./sessionState";

interface SentMessage {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

class FakeTransport implements AppServerTransport {
  startCount = 0;
  stopCount = 0;
  sent: SentMessage[] = [];
  private messageHandlers = new Set<(line: string) => void>();
  private stoppedHandlers = new Set<() => void>();

  async start() {
    this.startCount += 1;
    return 1000 + this.startCount;
  }

  async stop() {
    this.stopCount += 1;
  }

  async send(line: string) {
    const message = JSON.parse(line) as SentMessage;
    this.sent.push(message);
    if (message.method === "initialize" && message.id !== undefined) {
      this.emit({
        id: message.id,
        result: {
          userAgent: "test",
          codexHome: "C:\\app\\codex-home",
          platformFamily: "windows",
          platformOs: "windows",
        },
      });
    }
  }

  async onMessage(handler: (line: string) => void): Promise<DisposeListener> {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  async onStopped(handler: () => void): Promise<DisposeListener> {
    this.stoppedHandlers.add(handler);
    return () => this.stoppedHandlers.delete(handler);
  }

  emit(message: unknown) {
    const line = typeof message === "string" ? message : JSON.stringify(message);
    this.messageHandlers.forEach((handler) => handler(line));
  }

  emitStopped() {
    this.stoppedHandlers.forEach((handler) => handler());
  }
}

describe("AppServerClient", () => {
  it("deduplicates concurrent starts and performs one handshake", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);

    await Promise.all([client.start(), client.start(), client.start()]);

    expect(transport.startCount).toBe(1);
    expect(transport.sent.filter((message) => message.method === "initialize")).toEqual([
      expect.objectContaining({
        params: expect.objectContaining({ capabilities: { experimentalApi: true } }),
      }),
    ]);
    expect(transport.sent.filter((message) => message.method === "initialized")).toHaveLength(1);
    expect(client.connectionStatus).toBe("ready");
    expect(client.serverInfo?.codexHome).toBe("C:\\app\\codex-home");
  });

  it("matches responses to pending requests", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();

    const responsePromise = client.request<{ ok: boolean }>("test/read", { value: 1 });
    const request = transport.sent[transport.sent.length - 1];
    transport.emit({ id: request?.id, result: { ok: true } });

    await expect(responsePromise).resolves.toEqual({ ok: true });
  });

  it("times out requests that never receive a response", async () => {
    vi.useFakeTimers();
    try {
      const transport = new FakeTransport();
      const client = new AppServerClient(transport, 50);
      await client.start();

      const responsePromise = client.request("test/hang");
      const assertion = expect(responsePromise).rejects.toThrow("app-server 请求超时：test/hang");
      await vi.advanceTimersByTimeAsync(51);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects every pending request when the process stops", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();

    const first = client.request("test/first");
    const second = client.request("test/second");
    transport.emitStopped();

    await expect(first).rejects.toThrow("app-server 意外退出（等待：test/first）");
    await expect(second).rejects.toThrow("app-server 意外退出（等待：test/second）");
    expect(client.connectionStatus).toBe("stopped");
  });

  it("reports malformed protocol messages instead of silently dropping them", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const errors: string[] = [];
    client.onProtocolError((error) => errors.push(error.message));
    await client.start();

    transport.emit("not-json");

    expect(errors).toEqual([expect.stringContaining("无法解析 app-server 消息")]);
  });

  it("answers reverse requests through the registered handler", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();
    client.onReverseRequest("test/approval", async () => ({ decision: "accept" }));

    transport.emit({ id: "server-1", method: "test/approval", params: { value: 1 } });

    await vi.waitFor(() => {
      expect(transport.sent).toContainEqual({ id: "server-1", result: { decision: "accept" } });
    });
  });

  it("uses stable app-server methods for P0 workspace and thread operations", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();

    const search = client.fuzzyFileSearch({
      query: "App",
      roots: ["C:\\work"],
      cancellationToken: "composer",
    });
    const searchRequest = transport.sent[transport.sent.length - 1];
    expect(searchRequest).toMatchObject({ method: "fuzzyFileSearch" });
    transport.emit({ id: searchRequest.id, result: { files: [] } });
    await expect(search).resolves.toEqual({ files: [] });

    const directory = client.readDirectory({ path: "C:\\work" });
    const directoryRequest = transport.sent[transport.sent.length - 1];
    expect(directoryRequest).toMatchObject({
      method: "fs/readDirectory",
      params: { path: "C:\\work" },
    });
    transport.emit({ id: directoryRequest.id, result: { entries: [] } });
    await expect(directory).resolves.toEqual({ entries: [] });

    const file = client.readFile({ path: "C:\\work\\README.md" });
    const fileRequest = transport.sent[transport.sent.length - 1];
    expect(fileRequest).toMatchObject({
      method: "fs/readFile",
      params: { path: "C:\\work\\README.md" },
    });
    transport.emit({ id: fileRequest.id, result: { dataBase64: "IyBSRUFETUU=" } });
    await expect(file).resolves.toEqual({ dataBase64: "IyBSRUFETUU=" });

    const archive = client.archiveThread({ threadId: "thread-1" });
    const archiveRequest = transport.sent[transport.sent.length - 1];
    expect(archiveRequest).toMatchObject({
      method: "thread/archive",
      params: { threadId: "thread-1" },
    });
    transport.emit({ id: archiveRequest.id, result: {} });
    await expect(archive).resolves.toEqual({});
  });

  it("routes activity notifications only to the active thread", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const actions: AgentSessionAction[] = [];
    const startedThreads: string[] = [];
    const completedThreads: string[] = [];
    await client.start();
    const dispose = subscribeToSessionEvents(client, {
      currentThreadId: () => "thread-active",
      dispatch: (action) => actions.push(action),
      onTurnStarted: (notification) => startedThreads.push(notification.threadId),
      onTurnCompleted: (notification) => completedThreads.push(notification.threadId),
      onError: () => undefined,
      onThreadName: () => undefined,
      onStopped: () => undefined,
      onProtocolError: () => undefined,
      requestApproval: async () => ({ decision: "decline" }),
    });

    transport.emit({
      method: "turn/diff/updated",
      params: { threadId: "thread-other", turnId: "turn-1", diff: "ignored" },
    });
    transport.emit({
      method: "turn/diff/updated",
      params: { threadId: "thread-active", turnId: "turn-1", diff: "+kept" },
    });
    transport.emit({
      method: "turn/started",
      params: {
        threadId: "thread-background",
        turn: {
          id: "turn-background",
          items: [],
          itemsView: "full",
          status: "inProgress",
          error: null,
          startedAt: 1,
          completedAt: null,
          durationMs: null,
        },
      },
    });
    transport.emit({
      method: "turn/completed",
      params: {
        threadId: "thread-background",
        turn: {
          id: "turn-background",
          items: [],
          itemsView: "full",
          status: "completed",
          error: null,
          startedAt: 1,
          completedAt: 2,
          durationMs: 1000,
        },
      },
    });

    expect(actions).toEqual([{
      type: "turnDiffUpdated",
      notification: { threadId: "thread-active", turnId: "turn-1", diff: "+kept" },
    }]);
    expect(startedThreads).toEqual(["thread-background"]);
    expect(completedThreads).toEqual(["thread-background"]);
    dispose();
  });

  it("uses stable app-server methods for slash-command capabilities", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();

    const cases = [
      { run: () => client.listSkills({ cwds: ["C:\\work"], forceReload: false }), method: "skills/list", result: { data: [] } },
      { run: () => client.listMcpServers({ detail: "toolsAndAuthOnly", limit: 100 }), method: "mcpServerStatus/list", result: { data: [], nextCursor: null } },
      { run: () => client.compactThread({ threadId: "thread-1" }), method: "thread/compact/start", result: {} },
      { run: () => client.getThreadGoal({ threadId: "thread-1" }), method: "thread/goal/get", result: { goal: null } },
      { run: () => client.setThreadGoal({ threadId: "thread-1", objective: "ship", status: "active" }), method: "thread/goal/set", result: { goal: { objective: "ship" } } },
      { run: () => client.clearThreadGoal({ threadId: "thread-1" }), method: "thread/goal/clear", result: { cleared: true } },
    ];

    for (const item of cases) {
      const promise = item.run();
      const request = transport.sent[transport.sent.length - 1];
      expect(request.method).toBe(item.method);
      transport.emit({ id: request.id, result: item.result });
      await expect(promise).resolves.toEqual(item.result);
    }
  });

  it("sends plan mode through the isolated experimental turn field", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();

    const plan = client.startTurn(
      {
        threadId: "thread-1",
        input: [{ type: "text", text: "Plan this migration", text_elements: [] }],
        model: "gpt-test",
        effort: "high",
      },
      {
        mode: "plan",
        settings: {
          model: "gpt-test",
          reasoning_effort: "high",
          developer_instructions: null,
        },
      },
    );
    const request = transport.sent[transport.sent.length - 1];

    expect(request).toMatchObject({
      method: "turn/start",
      params: {
        threadId: "thread-1",
        collaborationMode: {
          mode: "plan",
          settings: {
            model: "gpt-test",
            reasoning_effort: "high",
            developer_instructions: null,
          },
        },
      },
    });
    transport.emit({ id: request.id, result: { turn: { id: "turn-plan" } } });
    await expect(plan).resolves.toEqual({ turn: { id: "turn-plan" } });
  });

  it("keeps default turns on the stable request shape", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();

    const turn = client.startTurn({
      threadId: "thread-1",
      input: [{ type: "text", text: "Implement this migration", text_elements: [] }],
      model: "gpt-test",
      effort: "high",
    });
    const request = transport.sent[transport.sent.length - 1];

    expect(request).toMatchObject({ method: "turn/start", params: { threadId: "thread-1" } });
    expect(request.params).not.toHaveProperty("collaborationMode");
    transport.emit({ id: request.id, result: { turn: { id: "turn-default" } } });
    await expect(turn).resolves.toEqual({ turn: { id: "turn-default" } });
  });
});
