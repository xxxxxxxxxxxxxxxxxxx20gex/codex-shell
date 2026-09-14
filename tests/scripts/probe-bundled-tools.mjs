import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, delimiter } from "node:path";
import { createInterface } from "node:readline";

const project = resolve(import.meta.dirname, "../..");
const directory = resolve(process.argv[2] || join(project, "src-tauri/target/debug"));
const home = await mkdtemp(join(tmpdir(), "cs-bundled-tools-"));
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (["PATH", "OPENAI_API_KEY", "CODEX_HOME"].includes(key.toUpperCase())) delete env[key];
}
env.PATH = [directory, join(env.SystemRoot, "System32")].join(delimiter);
env.CODEX_HOME = home;
const child = spawn(join(directory, "codex.exe"), ["app-server", "--stdio"], {
  cwd: project, env, stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
});
const pending = new Map();
let id = 0;
const lines = createInterface({ input: child.stdout });
lines.on("line", (line) => {
  const message = JSON.parse(line);
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
  else callback.resolve(message.result);
});
child.stderr.resume();
child.on("error", (error) => {
  for (const callback of pending.values()) callback.reject(error);
});
child.on("exit", (code) => {
  for (const callback of pending.values()) callback.reject(new Error(`Runtime exited: ${code}`));
});
function request(method, params) {
  return new Promise((resolveRequest, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve: resolveRequest, reject });
    child.stdin.write(`${JSON.stringify({ id: requestId, method, params })}\n`);
  });
}
const timeout = setTimeout(() => child.kill(), 30_000);
try {
  await request("initialize", {
    clientInfo: { name: "cs-bundled-tools-probe", version: "0.1.0" },
    capabilities: { experimentalApi: false },
  });
  child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
  const result = await request("command/exec", {
    command: [join(env.SystemRoot, "System32/WindowsPowerShell/v1.0/powershell.exe"),
      "-NoProfile", "-NonInteractive", "-Command",
      "(Get-Command rg).Source; rg --version; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; rg --fixed-strings 'const RUNTIME_FILE_NAME' src-tauri/src/runtime/mod.rs; exit $LASTEXITCODE"],
    cwd: project,
    sandboxPolicy: { type: "dangerFullAccess" },
    timeoutMs: 15_000,
  });
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.ok(result.stdout.toLowerCase().includes(join(directory, "rg.exe").toLowerCase()), result.stdout);
  assert.ok(result.stdout.includes("ripgrep 15.2.0"), result.stdout);
  assert.ok(result.stdout.includes("const RUNTIME_FILE_NAME"), result.stdout);
  console.log("PASS: app-server -> PowerShell -> bundled rg (no host tool PATH, no model request)");
} finally {
  clearTimeout(timeout);
  lines.close();
  if (child.exitCode === null && child.signalCode === null) {
    const exited = new Promise((resolveExit) => child.once("exit", resolveExit));
    child.kill();
    await exited;
  }
  await rm(home, { recursive: true, force: true });
}
