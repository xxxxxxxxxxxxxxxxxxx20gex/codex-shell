import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { once } from "node:events";

const root = resolve(import.meta.dirname, "../..");
const temporary = await mkdtemp(join(tmpdir(), "cs-extensions-probe-"));
const home = join(temporary, "home");
const repo = join(temporary, "market");
await mkdir(join(home, "skills", "probe"), { recursive: true });
await writeFile(join(home, "skills", "probe", "SKILL.md"), "---\nname: probe\ndescription: Local verification fixture\n---\nVerify extensions.\n");
await mkdir(join(repo, ".agents", "plugins"), { recursive: true });
await mkdir(join(repo, ".git"));
await mkdir(join(repo, "plugins", "demo", ".codex-plugin"), { recursive: true });
await writeFile(join(repo, ".agents", "plugins", "marketplace.json"), JSON.stringify({ name: "cs-probe", plugins: [{ name: "demo", source: { source: "local", path: "./plugins/demo" } }] }));
await writeFile(join(repo, "plugins", "demo", ".codex-plugin", "plugin.json"), JSON.stringify({ name: "demo", description: "Local probe" }));
const child = spawn(join(root, "src-tauri/binaries/codex-x86_64-pc-windows-msvc.exe"), ["app-server", "--stdio"], {
  cwd: temporary, env: { ...process.env, CODEX_HOME: home, OPENAI_API_KEY: "" }, stdio: ["pipe", "pipe", "pipe"],
});
child.stderr.resume();
const pending = new Map();
let nextId = 1;
createInterface({ input: child.stdout }).on("line", (line) => {
  const message = JSON.parse(line);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  clearTimeout(waiter.timeout);
  if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
  else waiter.resolve(message.result);
});
function request(method, params = {}) {
  return new Promise((resolveRequest, reject) => {
    const id = nextId++;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 20000);
    pending.set(id, { resolve: resolveRequest, reject, timeout });
    child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
  });
}
try {
  await request("initialize", { clientInfo: { name: "cs-extensions-probe", version: "0.1.4" }, capabilities: { experimentalApi: false } });
  child.stdin.write('{"method":"initialized"}\n');
  const skills = await request("skills/list", { cwds: [temporary], forceReload: true });
  const skill = skills.data.flatMap((entry) => entry.skills).find((item) => item.name === "probe");
  assert.ok(skill, "CS user skill discovered");
  assert.equal((await request("skills/config/write", { path: skill.path, enabled: false })).effectiveEnabled, false);
  const disabled = await request("skills/list", { cwds: [temporary], forceReload: true });
  assert.equal(disabled.data.flatMap((entry) => entry.skills).find((item) => item.name === "probe").enabled, false);
  await request("skills/config/write", { path: skill.path, enabled: true });
  console.log("PASS Skills: list, persistent disable, re-enable");
  let config = await request("config/read", { includeLayers: true });
  let user = config.layers.find((layer) => layer.name.type === "user" && !layer.name.profile);
  assert.ok(user);
  await request("config/batchWrite", { expectedVersion: user.version, edits: [{ keyPath: "mcp_servers.cs_probe", value: { command: "not-executed", enabled: false }, mergeStrategy: "replace" }] });
  config = await request("config/read", { includeLayers: true });
  user = config.layers.find((layer) => layer.name.type === "user" && !layer.name.profile);
  assert.equal(user.config.mcp_servers.cs_probe.enabled, false);
  await request("config/batchWrite", { expectedVersion: user.version, edits: [{ keyPath: "mcp_servers.cs_probe", value: null, mergeStrategy: "replace" }] });
  await request("config/mcpServer/reload");
  console.log("PASS MCP: versioned add/remove, reload");
  const added = await request("marketplace/add", { source: repo });
  const plugins = await request("plugin/list", { marketplaceKinds: ["local"] });
  const market = plugins.marketplaces.find((item) => item.name === "cs-probe");
  assert.ok(market, JSON.stringify(plugins.marketplaceLoadErrors));
  await request("plugin/read", { marketplacePath: market.path, pluginName: "demo" });
  await request("plugin/install", { marketplacePath: market.path, pluginName: "demo" });
  const installed = await request("plugin/list", { marketplaceKinds: ["local"] });
  const plugin = installed.marketplaces.find((item) => item.name === "cs-probe").plugins.find((item) => item.name === "demo");
  assert.equal(plugin.installed, true);
  await request("plugin/uninstall", { pluginId: plugin.id });
  await request("marketplace/remove", { marketplaceName: added.marketplaceName });
  console.log("PASS Plugins: local marketplace add/list/read/install/uninstall/remove");
} finally {
  for (const waiter of pending.values()) clearTimeout(waiter.timeout);
  if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
  assert.ok(temporary.startsWith(join(tmpdir(), "cs-extensions-probe-")));
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
