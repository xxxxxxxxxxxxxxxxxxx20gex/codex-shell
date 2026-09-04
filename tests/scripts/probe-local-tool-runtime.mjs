import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { once } from "node:events";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const binaryRoot = join(projectRoot, "src-tauri", "binaries");
const baseUrl = process.env.CODEX_SHELL_PROBE_BASE_URL?.replace(/\/$/, "");
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.CODEX_SHELL_PROBE_MODEL || "gpt-5.6-sol";
const timeoutMs = Number(process.env.CODEX_SHELL_PROBE_TIMEOUT_MS || 300_000);

if (!baseUrl) throw new Error("CODEX_SHELL_PROBE_BASE_URL is required");
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const temporaryRoot = await mkdtemp(join(projectRoot, ".runtime-probe-"));
const temporaryHome = join(temporaryRoot, "home");
const runtimeDirectory = join(temporaryRoot, "runtime");
await mkdir(temporaryHome);
await mkdir(runtimeDirectory);
const stagedBinaries = [
  ["codex-x86_64-pc-windows-msvc.exe", "codex.exe"],
  ["codex-code-mode-host-x86_64-pc-windows-msvc.exe", "codex-code-mode-host.exe"],
  ["codex-windows-sandbox-setup-x86_64-pc-windows-msvc.exe", "codex-windows-sandbox-setup.exe"],
  ["codex-command-runner-x86_64-pc-windows-msvc.exe", "codex-command-runner.exe"],
];
await Promise.all(stagedBinaries.map(([source, destination]) => (
  copyFile(join(binaryRoot, source), join(runtimeDirectory, destination))
)));
const runtime = join(runtimeDirectory, "codex.exe");
const providerId = "local_tool_probe";
const child = spawn(runtime, [
  "app-server",
  "--stdio",
  "-c", "features.code_mode_host=true",
  "-c", "features.plugins=false",
  "-c", `model=${JSON.stringify(model)}`,
  "-c", `model_provider=${JSON.stringify(providerId)}`,
  "-c", `model_providers.${providerId}.name="Local Tool Probe"`,
  "-c", `model_providers.${providerId}.base_url=${JSON.stringify(baseUrl)}`,
  "-c", `model_providers.${providerId}.wire_api="responses"`,
  "-c", `model_providers.${providerId}.env_key="OPENAI_API_KEY"`,
  "-c", `model_providers.${providerId}.requires_openai_auth=false`,
], {
  cwd: projectRoot,
  env: { ...process.env, CODEX_HOME: temporaryHome, OPENAI_API_KEY: apiKey },
  stdio: ["pipe", "pipe", "pipe"],
});

let nextId = 1;
const pending = new Map();
const itemTypes = [];
const stderrLines = [];
let completedTurn = null;
let resolveCompleted;
let rejectCompleted;
const completion = new Promise((resolveCompletion, rejectCompletion) => {
  resolveCompleted = resolveCompletion;
  rejectCompleted = rejectCompletion;
});

createInterface({ input: child.stdout }).on("line", (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  if (message.id !== undefined && pending.has(message.id)) {
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
    return;
  }
  if (message.method === "item/started" && message.params?.item?.type) {
    itemTypes.push(message.params.item.type);
  }
  if (message.method === "turn/completed") {
    completedTurn = message.params?.turn ?? null;
    resolveCompleted();
  }
});
createInterface({ input: child.stderr }).on("line", (line) => stderrLines.push(line));
child.on("error", rejectCompleted);
child.on("exit", (code) => {
  if (!completedTurn) rejectCompleted(new Error(`Runtime exited before turn completion (${code})`));
});

function request(method, params) {
  const id = nextId++;
  child.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
  return new Promise((resolveRequest, rejectRequest) => {
    pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
  });
}

try {
  await request("initialize", {
    clientInfo: { name: "codex-shell-local-tool-probe", title: "Local Tool Probe", version: "0.1.2" },
    capabilities: { experimentalApi: true, requestAttestation: false },
  });
  child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
  const started = await request("thread/start", {
    model,
    cwd: projectRoot,
    approvalPolicy: "never",
    sandbox: "danger-full-access",
    ephemeral: true,
  });
  await request("turn/start", {
    threadId: started.thread.id,
    input: [{
      type: "text",
      text: "Use the local execution tool to read package.json from the current workspace. Then answer with only the package name.",
      text_elements: [],
    }],
    model,
    effort: "low",
    approvalPolicy: "never",
    sandboxPolicy: { type: "dangerFullAccess" },
  });
  await Promise.race([
    completion,
    new Promise((_, rejectWait) => setTimeout(() => rejectWait(new Error("Tool probe timed out")), timeoutMs)),
  ]);

  const usedLocalTool = itemTypes.some((type) => ["commandExecution", "dynamicToolCall"].includes(type));
  if (!usedLocalTool) {
    const relevantLogs = stderrLines.filter((line) => /code.mode|exec|tool|error/i.test(line)).slice(-10);
    throw new Error(`Model completed without a local tool call. Items: ${itemTypes.join(", ") || "none"}. Runtime logs: ${relevantLogs.join(" | ") || "none"}`);
  }
  process.stdout.write(`${JSON.stringify({
    runtime: "pinned",
    model,
    turnStatus: completedTurn?.status ?? null,
    itemTypes,
    usedLocalTool,
  }, null, 2)}\n`);
} finally {
  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([once(child, "exit"), new Promise((resolveWait) => setTimeout(resolveWait, 5_000))]);
  }
  await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 2, retryDelay: 250 }).catch(() => undefined);
}
