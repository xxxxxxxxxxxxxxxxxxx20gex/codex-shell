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
const home = await mkdtemp(join(tmpdir(), "cs-async-question-probe-"));
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
    const item = requests.length === 1
      ? { id: "fc_question", type: "function_call", name: "request_user_input_async", call_id: "question-probe", arguments: JSON.stringify({questions:[{title:"Which project?",options:["Ready-made","Open source"]}]}) }
      : { id: `${id}-message`, type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "Local probe answer." }] };
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
  await connect(runtime);
  const {thread} = await client.rpc("thread/start", {cwd:home,approvalPolicy:"never",sandbox:"read-only"});
  await turn(thread.id,"Ask a question.");
  const question = client.events.find(e=>e.method==="item/completed" && e.params.item.type==="agentMessage" && e.params.item.questions?.length)?.params.item;
  assert(question, "Core must emit structured async question");
  assert.equal(question.delivery,"async");
  const reply = '<send_user_message_question_reply>\n'+JSON.stringify([{questionItemId:JSON.stringify(["request_user_input_async",question.id,0]),question:"Which project?",answer:"Custom answer"}])+'\n</send_user_message_question_reply>';
  await turn(thread.id,reply);
  assert(requests.some(r=>JSON.stringify(r.input).includes("questionItemId")), "Reply envelope must reach gateway");
  await client.stop();
  await connect(runtime);
  await client.rpc("thread/resume",{threadId:thread.id,excludeTurns:true});
  const turns=await history(thread.id);
  assert(turns.flatMap(t=>t.items).some(i=>i.type==="agentMessage"&&i.id===question.id&&i.questions?.length));
  assert(turns.flatMap(t=>t.items).some(i=>i.type==="userMessage"&&i.content.some(c=>c.type==="text"&&c.text===reply)));
  hold=true;
  const before=requests.length;
  const active=await client.rpc("turn/start",{threadId:thread.id,input:input("Keep working")});
  const deadline=Date.now()+30000;
  while(requests.length===before&&Date.now()<deadline) await new Promise(r=>setTimeout(r,50));
  await client.rpc("turn/steer",{threadId:thread.id,expectedTurnId:active.turn.id,input:input(reply)});
  await client.rpc("turn/interrupt",{threadId:thread.id,turnId:active.turn.id});
  await waitEvent("turn/completed",p=>p.turn.id===active.turn.id);
  console.log("PASS real Core async questions, reply envelope forwarding, cold history recovery and running turn/steer acceptance.");
} finally {
  await client?.stop();
  gateway.closeAllConnections();
  await new Promise(done=>gateway.close(done));
  await rm(home,{recursive:true,force:true,maxRetries:10,retryDelay:300});
}
