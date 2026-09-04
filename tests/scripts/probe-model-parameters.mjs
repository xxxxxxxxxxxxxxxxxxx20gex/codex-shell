import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { once } from "node:events";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const runtime = join(projectRoot, "src-tauri", "binaries", "codex-x86_64-pc-windows-msvc.exe");
const upstreamBaseUrl = process.env.CODEX_SHELL_PROBE_BASE_URL?.replace(/\/$/, "");
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.CODEX_SHELL_PROBE_MODEL || "gpt-5.6-sol";
const efforts = (process.env.CODEX_SHELL_PROBE_EFFORTS || "low,high").split(",").map((value) => value.trim()).filter(Boolean);
const verbosities = (process.env.CODEX_SHELL_PROBE_VERBOSITIES || "low,high").split(",").map((value) => value.trim()).filter(Boolean);
const summaries = (process.env.CODEX_SHELL_PROBE_SUMMARIES || efforts.map(() => "auto").join(",")).split(",").map((value) => value.trim()).filter(Boolean);
const serviceTiers = (process.env.CODEX_SHELL_PROBE_SERVICE_TIERS || efforts.map(() => "default").join(",")).split(",").map((value) => value.trim()).filter(Boolean);
const upstreamTimeoutMs = Number(process.env.CODEX_SHELL_PROBE_TIMEOUT_MS || 180_000);

if (!upstreamBaseUrl) throw new Error("CODEX_SHELL_PROBE_BASE_URL is required");
if (!apiKey) throw new Error("OPENAI_API_KEY is required");
if (efforts.length !== verbosities.length) throw new Error("Effort and verbosity probe lists must have equal lengths");
if (efforts.length !== summaries.length || efforts.length !== serviceTiers.length) throw new Error("All model parameter probe lists must have equal lengths");

function upstreamUrl(requestUrl) {
  const base = new URL(`${upstreamBaseUrl}/`);
  const basePath = base.pathname.replace(/\/$/, "");
  const requestPath = requestUrl.split("?", 1)[0];
  const relativePath = basePath && requestPath.startsWith(`${basePath}/`)
    ? requestPath.slice(basePath.length + 1)
    : requestPath.replace(/^\//, "");
  return new URL(relativePath, base).toString();
}

function wireReasoningEffort(effort) {
  // Ultra is a Codex orchestration mode: Core deliberately sends max to the model
  // and enables proactive multi-agent instructions locally.
  return effort === "ultra" ? "max" : effort;
}

function assertObservation(requested, observation, verbosityIgnoredWarning, catalog) {
  const failures = [];
  const expectedReasoningEffort = wireReasoningEffort(requested.effort);
  if (observation.model !== requested.model) failures.push(`model: expected ${requested.model}, received ${observation.model}`);
  if (observation.reasoningEffort !== expectedReasoningEffort) failures.push(`reasoning effort: expected ${expectedReasoningEffort} on the wire for ${requested.effort}, received ${observation.reasoningEffort}`);
  if (observation.textVerbosity !== requested.verbosity) failures.push(`text verbosity: expected ${requested.verbosity}, received ${observation.textVerbosity}`);
  const expectedSummary = requested.summary === "none" ? null : requested.summary;
  if (observation.reasoningSummary !== expectedSummary) failures.push(`reasoning summary: expected ${expectedSummary}, received ${observation.reasoningSummary}`);
  const tierSupported = catalog?.serviceTiers.some((tier) => tier.id === requested.serviceTier);
  const expectedServiceTier = requested.serviceTier === "default" || !tierSupported ? null : requested.serviceTier;
  if (observation.serviceTier !== expectedServiceTier) failures.push(`service tier: expected ${expectedServiceTier}, received ${observation.serviceTier}`);
  if (observation.status < 200 || observation.status >= 300) failures.push(`upstream HTTP status: expected 2xx, received ${observation.status}`);
  if (verbosityIgnoredWarning) failures.push("Codex Core reported that model_verbosity was ignored");
  if (failures.length > 0) throw new Error(`Model parameter probe failed:\n- ${failures.join("\n- ")}`);
}

async function terminateChild(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGKILL");
  await Promise.race([
    once(child, "exit"),
    new Promise((resolveWait) => setTimeout(resolveWait, 5_000)),
  ]);
}

function rpcClient(child, notifications, stderrLines) {
  const pending = new Map();
  let nextId = 1;
  createInterface({ input: child.stdout }).on("line", (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (message.id !== undefined && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    } else if (message.method) {
      notifications.push(message);
    }
  });
  createInterface({ input: child.stderr }).on("line", (line) => stderrLines.push(line));
  return (method, params) => {
    const id = nextId++;
    child.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
    return new Promise((resolveRequest, reject) => pending.set(id, { resolve: resolveRequest, reject }));
  };
}

async function runProbe(effort, verbosity, summary, serviceTier) {
  const temporaryHome = await mkdtemp(join(tmpdir(), "codex-shell-model-params-"));
  const observations = [];
  let resolveObservation;
  let rejectObservation;
  const observationReady = new Promise((resolveRequest, rejectRequest) => {
    resolveObservation = resolveRequest;
    rejectObservation = rejectRequest;
  });

  const proxy = createServer(async (request, response) => {
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const rawBody = Buffer.concat(chunks);
      const body = JSON.parse(rawBody.toString("utf8"));
      const headers = { ...request.headers };
      delete headers.host;
      delete headers.connection;
      delete headers["content-length"];
      delete headers["accept-encoding"];
      const targetUrl = upstreamUrl(request.url);
      process.stderr.write(`[probe] forwarding ${effort}/${verbosity} to ${new URL(targetUrl).origin}${new URL(targetUrl).pathname}\n`);
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: rawBody,
        signal: AbortSignal.timeout(upstreamTimeoutMs),
      });
      const observation = {
        requestPath: request.url,
        status: upstream.status,
        model: body.model ?? null,
        reasoningEffort: body.reasoning?.effort ?? null,
        reasoningSummary: body.reasoning?.summary ?? null,
        textVerbosity: body.text?.verbosity ?? null,
        serviceTier: body.service_tier ?? null,
        stream: body.stream ?? null,
      };
      observations.push(observation);
      resolveObservation(observation);
      await upstream.body?.cancel();
      response.writeHead(502, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "parameter probe stopped after upstream acceptance" } }));
    } catch (error) {
      rejectObservation(error);
      response.writeHead(502, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { message: "parameter probe proxy failed" } }));
    }
  });
  await new Promise((resolveListen) => proxy.listen(0, "127.0.0.1", resolveListen));
  const address = proxy.address();
  if (!address || typeof address === "string") throw new Error("Unable to bind parameter probe proxy");

  const providerId = "parameter_probe";
  const child = spawn(runtime, [
    "app-server",
    "--stdio",
    "-c", `model=${JSON.stringify(model)}`,
    "-c", `model_provider=${JSON.stringify(providerId)}`,
    "-c", `model_providers.${providerId}.name="Parameter Probe"`,
    "-c", `model_providers.${providerId}.base_url="http://127.0.0.1:${address.port}/v1"`,
    "-c", `model_providers.${providerId}.wire_api="responses"`,
    "-c", `model_providers.${providerId}.env_key="OPENAI_API_KEY"`,
    "-c", `model_providers.${providerId}.requires_openai_auth=false`,
    "-c", `model_reasoning_effort=${effort}`,
    "-c", `model_verbosity=${verbosity}`,
    "-c", `model_reasoning_summary=${summary}`,
    "-c", `service_tier=${JSON.stringify(serviceTier)}`,
  ], {
    cwd: projectRoot,
    env: { ...process.env, CODEX_HOME: temporaryHome, OPENAI_API_KEY: apiKey },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const notifications = [];
  const stderrLines = [];
  const request = rpcClient(child, notifications, stderrLines);

  try {
    process.stderr.write(`[probe] starting ${effort} effort + ${verbosity} verbosity\n`);
    await request("initialize", {
      clientInfo: { name: "codex-shell-parameter-probe", title: "Parameter Probe", version: "0.1.2" },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    child.stdin.write(`${JSON.stringify({ method: "initialized" })}\n`);
    const models = await request("model/list", { cursor: null, limit: 100 });
    const selectedModel = models.data.find((item) => item.model === model || item.id === model) ?? null;
    const started = await request("thread/start", {
      model,
      cwd: projectRoot,
      approvalPolicy: "never",
      sandbox: "danger-full-access",
      ephemeral: true,
    });
    void request("turn/start", {
      threadId: started.thread.id,
      input: [{ type: "text", text: "Reply with exactly: PARAMETER_PROBE_OK", text_elements: [] }],
      model,
      effort,
    }).catch(rejectObservation);
    const observation = await Promise.race([
      observationReady,
      new Promise((_, rejectWait) => setTimeout(() => rejectWait(new Error(`No upstream response observed within ${upstreamTimeoutMs} ms`)), upstreamTimeoutMs)),
    ]);
    const result = {
      requested: { model, effort, verbosity, summary, serviceTier },
      expectedUpstream: { reasoningEffort: wireReasoningEffort(effort) },
      catalog: selectedModel ? {
        model: selectedModel.model,
        supportedReasoningEfforts: selectedModel.supportedReasoningEfforts.map((item) => item.reasoningEffort),
        defaultReasoningEffort: selectedModel.defaultReasoningEffort,
        serviceTiers: selectedModel.serviceTiers,
      } : null,
      upstream: observation,
      verbosityIgnoredWarning: stderrLines.some((line) => line.includes("model_verbosity is set but ignored")),
    };
    assertObservation(result.requested, result.upstream, result.verbosityIgnoredWarning, result.catalog);
    process.stderr.write(`[probe] accepted ${effort}/${verbosity} with HTTP ${observation.status}\n`);
    return result;
  } finally {
    await terminateChild(child);
    proxy.closeAllConnections();
    proxy.close();
    try {
      await Promise.race([
        rm(temporaryHome, { recursive: true, force: true, maxRetries: 2, retryDelay: 250 }),
        new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
      ]);
    } catch (error) {
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
    }
  }
}

const results = [];
for (let index = 0; index < efforts.length; index += 1) {
  results.push(await runProbe(efforts[index], verbosities[index], summaries[index], serviceTiers[index]));
}

process.stdout.write(`${JSON.stringify({ runtime: "pinned", model, results }, null, 2)}\n`, () => process.exit(0));
