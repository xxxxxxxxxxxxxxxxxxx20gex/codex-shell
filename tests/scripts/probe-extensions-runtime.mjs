import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { once } from "node:events";

const root = resolve(import.meta.dirname, "../..");
const temporary = await mkdtemp(join(tmpdir(), "cs-extensions-probe-"));
const home = join(temporary, "home");
const repo = join(temporary, "market");
await cp(join(root, "bundled/skills/amap"), join(home, "skills/amap"), { recursive: true });
await mkdir(join(home, "skills", "probe"), { recursive: true });
await writeFile(join(home, "skills", "probe", "SKILL.md"), "---\nname: probe\ndescription: Local verification fixture\n---\nVerify extensions.\n");
await mkdir(join(repo, ".agents", "plugins"), { recursive: true });
await mkdir(join(repo, ".git"));
await mkdir(join(repo, "plugins", "demo", ".codex-plugin"), { recursive: true });
await writeFile(join(repo, ".agents", "plugins", "marketplace.json"), JSON.stringify({ name: "cs-probe", plugins: [{ name: "demo", source: { source: "local", path: "./plugins/demo" } }] }));
await writeFile(join(repo, "plugins", "demo", ".codex-plugin", "plugin.json"), JSON.stringify({ name: "demo", description: "Local probe" }));
const pending = new Map();
let nextId = 1;
function startServer() {
  const child = spawn(join(root, "src-tauri/binaries/codex-x86_64-pc-windows-msvc.exe"), ["app-server", "--stdio"], {
    cwd: temporary, env: { ...process.env, CODEX_HOME: home, OPENAI_API_KEY: "" }, stdio: ["pipe", "pipe", "pipe"],
  });
  child.stderr.resume();
  createInterface({ input: child.stdout }).on("line", (line) => {
    const message = JSON.parse(line);
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    clearTimeout(waiter.timeout);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  });
  return child;
}
let child = startServer();
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
  const amap = skills.data.flatMap((entry) => entry.skills).find((item) => item.name === "amap");
  assert.ok(amap, "bundled AMap discovered");
  assert.equal(amap.interface.displayName, "高德地图");
  assert.equal((await request("skills/config/write", { path: amap.path, enabled: false })).effectiveEnabled, false);
  const amapDisabled = await request("skills/list", { cwds: [temporary], forceReload: true });
  assert.equal(amapDisabled.data.flatMap((entry) => entry.skills).find((item) => item.name === "amap").enabled, false);
  console.log("PASS AMap: bundled discovery, Chinese metadata and disabled state");
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

  const officeSource = join(root, "bundled", "office-marketplace");
  const preview = (await request("plugin/read", { marketplacePath: join(officeSource, ".agents/plugins/marketplace.json"), pluginName: "cs-office" })).plugin;
  assert.equal(preview.skills.length, 3);
  assert.equal(preview.summary.installed, false);
  assert.ok(preview.skills.every((skill) => skill.path));
  const content = await request("fs/readFile", { path: preview.skills[0].path });
  assert.ok(Buffer.from(content.dataBase64, "base64").toString("utf8").includes("---"));
  const officeAdded = await request("marketplace/add", { source: officeSource });
  const officeCatalog = await request("plugin/list", { marketplaceKinds: ["local"] });
  const officeMarket = officeCatalog.marketplaces.find((item) => item.name === "cs-curated");
  assert.ok(officeMarket, JSON.stringify(officeCatalog.marketplaceLoadErrors));
  await request("plugin/read", { marketplacePath: officeMarket.path, pluginName: "cs-office" });
  await request("plugin/install", { marketplacePath: officeMarket.path, pluginName: "cs-office" });
  const officeSkills = await request("skills/list", { cwds: [temporary], forceReload: true });
  const names = officeSkills.data.flatMap((entry) => entry.skills).map((item) => item.name);
  assert.ok(names.includes("cs-office:cs-pdf"), JSON.stringify(names));
  assert.ok(names.includes("cs-office:cs-documents"), JSON.stringify(names));
  assert.ok(names.includes("cs-office:cs-spreadsheets"), JSON.stringify(names));
  const installedOffice = (await request("plugin/list", { marketplaceKinds: ["local"] }))
    .marketplaces.find((item) => item.name === "cs-curated")
    .plugins.find((item) => item.name === "cs-office");
  assert.equal(installedOffice.installed, true);
  const officeDetail = (await request("plugin/read", { marketplacePath: officeMarket.path, pluginName: "cs-office" })).plugin;
  const officeSkill = officeSkills.data.flatMap((entry) => entry.skills).find((item) => item.pluginId === installedOffice.id && item.name === officeDetail.skills[0].name);
  assert.ok(officeSkill);
  assert.notEqual(officeSkill.path, officeDetail.skills[0].path, 'market preview and installed execution paths differ');
  assert.equal((await request("skills/config/write", { path: officeSkill.path, enabled: false })).effectiveEnabled, false);
  const readOfficeSkills = async () => (await request('skills/list', { cwds: [temporary], forceReload: true })).data.flatMap((entry) => entry.skills).filter((item) => item.pluginId === installedOffice.id);
  await request('plugin/read', { marketplacePath: officeMarket.path, pluginName: 'cs-office' });
  assert.equal((await readOfficeSkills()).find((skill) => skill.path === officeSkill.path).enabled, false);
  child.kill();
  await once(child, 'exit');
  child = startServer();
  await request('initialize', { clientInfo: { name: 'cs-extensions-probe', version: '0.1.7' }, capabilities: { experimentalApi: false } });
  child.stdin.write('{"method":"initialized"}\n');
  assert.equal((await readOfficeSkills()).find((skill) => skill.path === officeSkill.path).enabled, false, 'installed Skill stays disabled after restart');
  await request("skills/config/write", { path: officeSkill.path, enabled: true });
  assert.equal((await readOfficeSkills()).find((skill) => skill.path === officeSkill.path).enabled, true);
  await request("plugin/uninstall", { pluginId: installedOffice.id });
  assert.equal((await readOfficeSkills()).length, 0);
  await request("marketplace/remove", { marketplaceName: officeAdded.marketplaceName });
  console.log("PASS CS Office: installed paths, disable/reopen/restart/re-enable, uninstall removes skills");
} finally {
  for (const waiter of pending.values()) clearTimeout(waiter.timeout);
  if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
  assert.ok(temporary.startsWith(join(tmpdir(), "cs-extensions-probe-")));
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
