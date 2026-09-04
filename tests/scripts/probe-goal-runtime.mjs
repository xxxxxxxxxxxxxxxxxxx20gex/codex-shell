import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { once } from "node:events";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const runtime = join(
  projectRoot,
  "src-tauri",
  "binaries",
  "codex-x86_64-pc-windows-msvc.exe",
);
const temporaryHome = await mkdtemp(join(tmpdir(), "codex-shell-goal-probe-"));
const observedRequests = [];
const notifications = [];
const pending = new Map();
let resolveModelRequest;
const modelRequestObserved = new Promise((resolveRequest) => {
  resolveModelRequest = resolveRequest;
});

const gateway = createServer((request, response) => {
  observedRequests.push({ method: request.method, url: request.url });
  resolveModelRequest();
  request.resume();
  response.writeHead(503, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: { message: "local goal probe" } }));
});
await new Promise((resolveListen) => gateway.listen(0, "127.0.0.1", resolveListen));
const address = gateway.address();
if (!address || typeof address === "string") throw new Error("Unable to bind probe gateway");

const child = spawn(runtime, [
  "app-server",
  "--stdio",
  "-c", 'model="gpt-5.6-sol"',
  "-c", 'model_provider="goal_probe"',
  "-c", 'model_providers.goal_probe.name="Goal Probe"',
  "-c", `model_providers.goal_probe.base_url="http://127.0.0.1:${address.port}/v1"`,
  "-c", 'model_providers.goal_probe.wire_api="responses"',
  "-c", 'model_providers.goal_probe.env_key="OPENAI_API_KEY"',
  "-c", "model_providers.goal_probe.requires_openai_auth=false",
], {
  cwd: projectRoot,
  env: { ...process.env, CODEX_HOME: temporaryHome, OPENAI_API_KEY: "goal-probe" },
  stdio: ["pipe", "pipe", "pipe"],
});

createInterface({ input: child.stdout }).on("line", (line) => {
  const message = JSON.parse(line);
  if (message.id !== undefined && pending.has(message.id)) {
    const { resolveRequest, rejectRequest } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectRequest(new Error(JSON.stringify(message.error)));
    else resolveRequest(message.result);
  } else if (message.method) {
    notifications.push(message.method);
  }
});

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  child.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
  return new Promise((resolveRequest, rejectRequest) => {
    pending.set(id, { resolveRequest, rejectRequest });
  });
}

try {
  await request("initialize", {
    clientInfo: { name: "codex-shell-goal-probe", title: "Goal Probe", version: "0.1.1" },
    capabilities: { experimentalApi: true, requestAttestation: false },
  });
  child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
  const started = await request("thread/start", {
    cwd: projectRoot,
    approvalPolicy: "never",
    sandbox: "danger-full-access",
  });
  let goalStatus = "pending-runtime-effects";
  void request("thread/goal/set", {
    threadId: started.thread.id,
    objective: "Verify whether setting a goal starts a turn",
    status: "active",
  }).then((goal) => {
    goalStatus = goal.goal.status;
  }).catch(() => undefined);
  await Promise.race([
    modelRequestObserved,
    new Promise((_, rejectWait) => setTimeout(
      () => rejectWait(new Error("Goal set did not start a model request within 5 seconds")),
      5000,
    )),
  ]);
  process.stdout.write(`${JSON.stringify({
    runtime: "pinned",
    goalStatus,
    notifications,
    modelRequests: observedRequests,
  }, null, 2)}\n`);
} finally {
  if (child.exitCode === null) {
    child.kill();
    await once(child, "exit");
  }
  gateway.close();
  await new Promise((resolveWait) => setTimeout(resolveWait, 300));
  await rm(temporaryHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
