import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { createServer } from "node:http";

const root = resolve(import.meta.dirname, "../..");
const temporaryHome = await mkdtemp(join(tmpdir(), "cs-protocol-probe-"));
const gateway = createServer((request) => { request.resume(); });
await new Promise((resolveListen) => gateway.listen(0, "127.0.0.1", resolveListen));
const child = spawn(join(root, "src-tauri/binaries/codex-x86_64-pc-windows-msvc.exe"), [
  "app-server", "--stdio",
  "-c", 'model_provider="protocol_probe"',
  "-c", 'model_providers.protocol_probe.name="Protocol Probe"',
  "-c", `model_providers.protocol_probe.base_url="http://127.0.0.1:${gateway.address().port}/v1"`,
  "-c", 'model_providers.protocol_probe.wire_api="responses"',
  "-c", 'model_providers.protocol_probe.env_key="OPENAI_API_KEY"',
  "-c", "model_providers.protocol_probe.requires_openai_auth=false",
], {
  cwd: root,
  env: { ...process.env, CODEX_HOME: temporaryHome, OPENAI_API_KEY: "local-probe-only" },
  stdio: ["pipe", "pipe", "ignore"],
});
const pending = new Map();
const notifications = [];
let nextId = 1;
createInterface({ input: child.stdout }).on("line", (line) => {
  const message = JSON.parse(line);
  const waiter = pending.get(message.id);
  if (waiter) {
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  } else if (message.method) notifications.push(message);
});
function request(method, params) {
  const id = nextId++;
  return new Promise((resolveRequest, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: resolveRequest, reject, timer });
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  });
}

try {
  await request("initialize", {
    clientInfo: { name: "cs-protocol-probe", version: "0.1.4" },
    capabilities: { experimentalApi: true, requestAttestation: false },
  });
  child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
  const { thread } = await request("thread/start", { cwd: temporaryHome, approvalPolicy: "never", sandbox: "read-only" });
  const threadId = thread.id;
  await request("thread/settings/update", { threadId, model: "gpt-5.6-sol", effort: "high" });
  await assert.rejects(request("turn/settings/update", { threadId, turnId: "not-running", effort: "high" }), /step_model_switching/);
  await request("turn/start", { threadId, input: [{ type: "text", text: "local mock only", text_elements: [] }] });
  const input = [{ type: "text", text: "protocol probe; do not execute", text_elements: [] }];
  const added = await request("thread/queue/add", { threadId, clientUserMessageId: "probe-input", input });
  const queue = await request("thread/queue/list", { threadId });
  assert.equal(queue.data[0].id, added.queuedSubmission.id);
  await request("thread/queue/delete", { threadId, queuedSubmissionId: added.queuedSubmission.id });
  assert.deepEqual((await request("thread/queue/list", { threadId })).data, []);
  await assert.rejects(request("thread/turns/list", { threadId, sortDirection: "desc", itemsView: "full", limit: 200 }), /list_turns is not supported yet/);
  const metadata = await request("thread/read", { threadId, includeTurns: false });
  assert.equal(metadata.thread.id, threadId);
  assert(notifications.some((message) => message.method === "thread/settings/updated"));
  assert(notifications.some((message) => message.method === "thread/queue/changed"));
  console.log("Protocol probe passed: thread settings, queue add/list/delete + notifications, metadata read. Turn used only a local mock gateway. This Runtime rejects list_turns and requires step_model_switching for live turn settings; neither is claimed verified functional.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const waiter of pending.values()) clearTimeout(waiter.timer);
  if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
  gateway.closeAllConnections();
  await new Promise((resolveClose) => gateway.close(resolveClose));
  await rm(temporaryHome, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }).catch((error) => {
    console.error(`Temporary probe directory cleanup failed (${error.code}): ${temporaryHome}`);
    process.exitCode = 1;
  });
}
