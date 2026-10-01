import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

const root = resolve(import.meta.dirname, "../..");
const runtime = resolve(process.argv[2] ?? join(root, "src-tauri/binaries/codex-x86_64-pc-windows-msvc.exe"));
const legacyRuntime = process.argv[3] && resolve(process.argv[3]);
const home = await mkdtemp(join(tmpdir(), "cs-runtime-upgrade-"));
const requests = [];
let hold = false;
const gateway = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    if (!request.url.endsWith("/responses")) { response.writeHead(404); response.end(); return; }
    requests.push(JSON.parse(body));
    if (hold) return;
    const id = `probe-${requests.length}`;
    const item = { id: `${id}-message`, type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Local probe answer." }] };
    response.writeHead(200, { "content-type": "text/event-stream" });
    for (const event of [
      { type: "response.created", response: { id, status: "in_progress", output: [] } },
      { type: "response.output_item.added", output_index: 0, item },
      { type: "response.output_item.done", output_index: 0, item },
      { type: "response.completed", response: { id, status: "completed", output: [item], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 } } },
    ]) response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    response.end();
  });
});
await new Promise((done) => gateway.listen(0, "127.0.0.1", done));
const providerArgs = [
  "-c", 'model="gpt-6-sol"',
  "-c", 'model_provider="upgrade_probe"',
  "-c", 'model_providers.upgrade_probe.name="Local upgrade probe"',
  "-c", `model_providers.upgrade_probe.base_url="http://127.0.0.1:${gateway.address().port}/v1"`,
  "-c", 'model_providers.upgrade_probe.env_key="OPENAI_API_KEY"',
  "-c", 'model_providers.upgrade_probe.wire_api="responses"',
  "-c", "model_providers.upgrade_probe.requires_openai_auth=false",
];
const env = { ...process.env, CODEX_HOME: home, OPENAI_API_KEY: "local-probe-only" };
let client;
async function connect(binary) {
  const migrationArgs = binary === runtime ? ["-c", "features.background_paginated_rollout_migration=true"] : [];
  const child = spawn(binary, ["app-server", "--stdio", ...providerArgs, ...migrationArgs], { cwd: home, env, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
  const pending = new Map();
  const events = [];
  let nextId = 0;
  createInterface({ input: child.stdout }).on("line", (line) => {
    const message = JSON.parse(line);
    const waiter = pending.get(message.id);
    if (waiter) {
      clearTimeout(waiter.timer);
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(`${waiter.method}: ${JSON.stringify(message.error)}`));
      else waiter.resolve(message.result);
    } else if (message.method) events.push(message);
  });
  child.on("exit", () => {
    for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error(`Runtime exited during ${p.method}`)); }
    pending.clear();
  });
  const rpc = (method, params) => new Promise((resolveRequest, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 30000);
    pending.set(id, { method, resolve: resolveRequest, reject, timer });
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  });
  const connection = {
    rpc, events,
    async stop() {
      if (child.exitCode === null && child.signalCode === null) { const exited = once(child, "exit"); child.stdin.end(); const timer = setTimeout(() => child.kill(), 3000); await exited; clearTimeout(timer); }
    },
  };
  client = connection;
  await rpc("initialize", { clientInfo: { name: "cs-upgrade-probe", version: "1" }, capabilities: { experimentalApi: true, requestAttestation: false } });
  child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
  return connection;
}
async function waitEvent(method, predicate) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const event = client.events.find((entry) => entry.method === method && predicate(entry.params));
    if (event) return event.params;
    await new Promise((done) => setTimeout(done, 50));
  }
  throw new Error(`Timeout waiting for ${method}`);
}
const input = (text) => [{ type: "text", text, text_elements: [] }];
async function turn(threadId, text) {
  const { turn: started } = await client.rpc("turn/start", { threadId, input: input(text) });
  const completed = await waitEvent("turn/completed", (p) => p.threadId === threadId && p.turn.id === started.id);
  assert.equal(completed.turn.status, "completed");
  return started.id;
}
async function history(threadId) {
  return (await client.rpc("thread/turns/list", { threadId, sortDirection: "desc", itemsView: "full", limit: 200 })).data;
}
try {
  let oldThreadId;
  let backgroundThreadId;
  let defaultThreadId;
  if (legacyRuntime) {
    await connect(legacyRuntime);
    const { thread } = await client.rpc("thread/start", { cwd: home, approvalPolicy: "never", sandbox: "read-only", historyMode: "legacy" });
    oldThreadId = thread.id;
    await turn(oldThreadId, "Legacy first input");
    await turn(oldThreadId, "Legacy second input");
    const background = await client.rpc("thread/start", { cwd: home, approvalPolicy: "never", sandbox: "read-only", historyMode: "legacy" });
    backgroundThreadId = background.thread.id;
    await turn(backgroundThreadId, "Legacy background migration input");
    const defaultThread = await client.rpc("thread/start", { cwd: home, approvalPolicy: "never", sandbox: "read-only" });
    defaultThreadId = defaultThread.thread.id;
    await turn(defaultThreadId, "Previous runtime default history");
    await client.stop();
    const migration = spawn(runtime, ["migrate-rollouts", "--apply", "--json", "--thread", oldThreadId, ...providerArgs], { env, cwd: home, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    migration.stdout.on("data", (chunk) => { output += chunk; });
    migration.stderr.resume();
    const timer = setTimeout(() => migration.kill(), 30000);
    const [code] = await once(migration, "exit");
    clearTimeout(timer);
    assert.equal(code, 0, "Native legacy migration must succeed");
    assert(JSON.parse(output).outcomes.some((entry) => entry.status === "migrated"), output);
    console.log("PASS native legacy migration (isolated fixture)");
  }
  await connect(runtime);
  if (defaultThreadId) {
    await client.rpc("thread/resume", { threadId: defaultThreadId, excludeTurns: true });
    const previous = await history(defaultThreadId);
    assert.equal(previous.length, 1);
    assert(previous[0].items.some((item) => item.type === "userMessage" && item.content.some((content) => content.type === "text" && content.text === "Previous runtime default history")));
    console.log("PASS previous Runtime default history preserves input after upgrade");
  }
  if (backgroundThreadId) {
    const deadline = Date.now() + 30000;
    let mode;
    do {
      mode = (await client.rpc("thread/read", { threadId: backgroundThreadId, includeTurns: false })).thread.historyMode;
      if (mode === "paginated") break;
      await new Promise((done) => setTimeout(done, 100));
    } while (Date.now() < deadline);
    assert.equal(mode, "paginated", "Native startup migration must complete");
    await client.rpc("thread/resume", { threadId: backgroundThreadId, excludeTurns: true });
    const migrated = await history(backgroundThreadId);
    assert.equal(migrated.length, 1);
    await client.rpc("thread/revert", { threadId: backgroundThreadId, beforeTurnId: migrated[0].id });
    assert.equal((await history(backgroundThreadId)).length, 0);
    console.log("PASS native background legacy migration and revert");
  }
  if (oldThreadId) {
    await client.rpc("thread/resume", { threadId: oldThreadId, excludeTurns: true });
    const turns = await history(oldThreadId);
    assert.equal(turns.length, 2);
    await client.rpc("thread/revert", { threadId: oldThreadId, beforeTurnId: turns[0].id });
    assert.equal((await history(oldThreadId)).length, 1);
    await turn(oldThreadId, "Legacy replacement input");
    assert.equal((await history(oldThreadId)).length, 2);
    console.log("PASS migrated legacy resume, pagination, revert and replacement");
  }
  const { thread } = await client.rpc("thread/start", { cwd: home, approvalPolicy: "never", sandbox: "read-only", historyMode: "paginated" });
  assert.equal(thread.historyMode, "paginated");
  const first = await turn(thread.id, "First input");
  const last = await turn(thread.id, "Second input");
  assert.deepEqual((await history(thread.id)).map((entry) => entry.id), [last, first]);
  await client.rpc("thread/settings/update", { threadId: thread.id, effort: "high" });
  await client.rpc("thread/revert", { threadId: thread.id, beforeTurnId: last });
  assert.deepEqual((await history(thread.id)).map((entry) => entry.id), [first]);
  await turn(thread.id, "Replacement input");
  const fork = await client.rpc("thread/fork", { threadId: thread.id, lastTurnId: first, excludeTurns: true });
  assert.equal((await history(fork.thread.id)).length, 1);
  const side = await client.rpc("thread/fork", { threadId: thread.id, lastTurnId: first, ephemeral: true, excludeTurns: true, sandbox: "read-only", approvalPolicy: "never", threadSource: "codex-shell-side-chat" });
  assert.equal(side.thread.ephemeral, true);
  assert.deepEqual(side.thread.turns, []);
  await turn(side.thread.id, "Side chat input");
  await client.rpc("thread/unsubscribe", { threadId: side.thread.id });
  console.log("PASS ephemeral paginated side-chat fork and turn");
  await client.rpc("thread/archive", { threadId: fork.thread.id });
  await client.rpc("thread/unarchive", { threadId: fork.thread.id });
  hold = true;
  const requestsBeforeHold = requests.length;
  const active = await client.rpc("turn/start", { threadId: thread.id, input: input("Held request") });
  const requestDeadline = Date.now() + 30000;
  while (requests.length === requestsBeforeHold && Date.now() < requestDeadline) {
    await new Promise((done) => setTimeout(done, 50));
  }
  assert(requests.length > requestsBeforeHold, "Held turn must reach the mock gateway before queue checks");
  const queued = await client.rpc("thread/queue/add", { threadId: thread.id, clientUserMessageId: "upgrade-queue", input: input("Queued input") });
  assert.equal((await client.rpc("thread/queue/list", { threadId: thread.id })).data[0].id, queued.queuedSubmission.id);
  await client.rpc("thread/queue/delete", { threadId: thread.id, queuedSubmissionId: queued.queuedSubmission.id });
  assert.equal((await client.rpc("thread/queue/list", { threadId: thread.id })).data.length, 0);
  await client.rpc("turn/interrupt", { threadId: thread.id, turnId: active.turn.id });
  await waitEvent("turn/completed", (p) => p.turn.id === active.turn.id);
  assert(client.events.some((event) => event.method === "thread/reverted"));
  assert(client.events.some((event) => event.method === "thread/settings/updated"));
  assert(client.events.some((event) => event.method === "thread/queue/changed"));
  await client.stop();
  await connect(runtime);
  await client.rpc("thread/resume", { threadId: thread.id, excludeTurns: true });
  assert.equal((await history(thread.id)).length, 3);
  console.log("PASS new history, revert, replacement, fork, archive, settings, queue, notifications and cold resume");
  console.log(`Local mock Responses requests: ${requests.length}; no real model credentials or user sessions used.`);
} catch (error) {
  console.error(error);
  console.error(JSON.stringify(client?.events.filter((event) => event.method === "turn/completed").map((event) => ({ status: event.params.turn.status, error: event.params.turn.error })), null, 2));
  process.exitCode = 1;
} finally {
  await client?.stop();
  gateway.closeAllConnections();
  await new Promise((done) => gateway.close(done));
  await rm(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}
