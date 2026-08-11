import { describe, expect, it, vi } from "vitest";
import { AppServerClient, REVERSE_REQUEST_DISMISSED } from "./appServerClient";
import { FakeTransport } from "./appServerClientTestSupport";

describe("AppServerClient", () => {
  it("deduplicates concurrent starts and performs one handshake", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);

    await Promise.all([client.start(), client.start(), client.start()]);

    expect(transport.startCount).toBe(1);
    expect(transport.sent.filter((message) => message.method === "initialize")).toEqual([
      expect.objectContaining({
        params: expect.objectContaining({
          capabilities: {
            experimentalApi: true,
            mcpServerOpenaiFormElicitation: true,
          },
        }),
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

  it("subscribes to app-server stderr logs and disposes the transport listener", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const lines: string[] = [];
    const disposedHandler = vi.fn();
    client.onLog(disposedHandler)();
    client.onLog((line) => lines.push(line));
    await client.start();

    transport.emitLog("first line");
    await client.stop();
    transport.emitLog("ignored after stop");

    expect(lines).toEqual(["first line"]);
    expect(disposedHandler).not.toHaveBeenCalled();
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

  it("passes the server request id to reverse handlers and can dismiss stale requests", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    const handler = vi.fn(async (): Promise<typeof REVERSE_REQUEST_DISMISSED> => REVERSE_REQUEST_DISMISSED);
    await client.start();
    client.onReverseRequest("test/input", handler);

    transport.emit({ id: "request-42", method: "test/input", params: { question: "value" } });

    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith({ question: "value" }, "request-42"));
    expect(transport.sent.some((message) => message.id === "request-42")).toBe(false);
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

    const watch = client.watchPath({ watchId: "watch-1", path: "C:\\work" });
    const watchRequest = transport.sent[transport.sent.length - 1];
    expect(watchRequest).toMatchObject({
      method: "fs/watch",
      params: { watchId: "watch-1", path: "C:\\work" },
    });
    transport.emit({ id: watchRequest.id, result: { path: "C:\\work" } });
    await expect(watch).resolves.toEqual({ path: "C:\\work" });

    const unwatch = client.unwatchPath({ watchId: "watch-1" });
    const unwatchRequest = transport.sent[transport.sent.length - 1];
    expect(unwatchRequest).toMatchObject({
      method: "fs/unwatch",
      params: { watchId: "watch-1" },
    });
    transport.emit({ id: unwatchRequest.id, result: {} });
    await expect(unwatch).resolves.toEqual({});

    const archive = client.archiveThread({ threadId: "thread-1" });
    const archiveRequest = transport.sent[transport.sent.length - 1];
    expect(archiveRequest).toMatchObject({
      method: "thread/archive",
      params: { threadId: "thread-1" },
    });
    transport.emit({ id: archiveRequest.id, result: {} });
    await expect(archive).resolves.toEqual({});
  });

  it("uses native v2 methods for thread, model, review, steering, and MCP workflows", async () => {
    const transport = new FakeTransport();
    const client = new AppServerClient(transport);
    await client.start();

    const read = client.readThread({ threadId: "thread-1", includeTurns: true });
    let request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "thread/read", params: { threadId: "thread-1", includeTurns: true } });
    transport.emit({ id: request.id, result: { thread: { id: "thread-1" } } });
    await read;

    const fork = client.forkThread({ threadId: "thread-1", ephemeral: false });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "thread/fork", params: { threadId: "thread-1", ephemeral: false } });
    transport.emit({ id: request.id, result: { thread: { id: "thread-2" } } });
    await fork;

    const models = client.listModels({ cursor: null, limit: 100 });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "model/list", params: { cursor: null, limit: 100 } });
    transport.emit({ id: request.id, result: { data: [], nextCursor: null } });
    await models;

    const review = client.startReview({ threadId: "thread-1", target: { type: "uncommittedChanges" }, delivery: "inline" });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "review/start" });
    transport.emit({ id: request.id, result: { turn: { id: "turn-review" }, reviewThreadId: "thread-1" } });
    await review;

    const steer = client.steerTurn({ threadId: "thread-1", expectedTurnId: "turn-1", input: [] });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "turn/steer", params: { threadId: "thread-1", expectedTurnId: "turn-1", input: [] } });
    transport.emit({ id: request.id, result: { turnId: "turn-1" } });
    await steer;

    const login = client.loginMcpServer({ name: "docs", threadId: "thread-1" });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "mcpServer/oauth/login", params: { name: "docs", threadId: "thread-1" } });
    transport.emit({ id: request.id, result: { authorizationUrl: "https://example.test/oauth" } });
    await login;

    const reload = client.reloadMcpServers();
    request = transport.sent[transport.sent.length - 1];
    expect(request).toEqual(expect.objectContaining({ method: "config/mcpServer/reload" }));
    expect(request.params).toBeUndefined();
    transport.emit({ id: request.id, result: {} });
    await reload;

    const resource = client.readMcpResource({ server: "docs", uri: "docs://readme", threadId: "thread-1" });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "mcpServer/resource/read", params: { server: "docs", uri: "docs://readme", threadId: "thread-1" } });
    transport.emit({ id: request.id, result: { contents: [] } });
    await resource;

    const unsubscribe = client.unsubscribeThread({ threadId: "thread-1" });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "thread/unsubscribe", params: { threadId: "thread-1" } });
    transport.emit({ id: request.id, result: { status: "notLoaded" } });
    await unsubscribe;

    const unarchive = client.unarchiveThread({ threadId: "thread-1" });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "thread/unarchive", params: { threadId: "thread-1" } });
    transport.emit({ id: request.id, result: { thread: { id: "thread-1" } } });
    await unarchive;

    const capabilities = client.readModelProviderCapabilities();
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "modelProvider/capabilities/read", params: {} });
    transport.emit({ id: request.id, result: { namespaceTools: false, imageGeneration: false, webSearch: true } });
    await capabilities;

    const readiness = client.readWindowsSandboxReadiness();
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "windowsSandbox/readiness" });
    expect(request.params).toBeUndefined();
    transport.emit({ id: request.id, result: { status: "ready" } });
    await readiness;

    const setup = client.startWindowsSandboxSetup({ mode: "unelevated", cwd: "C:\\work" });
    request = transport.sent[transport.sent.length - 1];
    expect(request).toMatchObject({ method: "windowsSandbox/setupStart", params: { mode: "unelevated", cwd: "C:\\work" } });
    transport.emit({ id: request.id, result: { started: true } });
    await setup;
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
