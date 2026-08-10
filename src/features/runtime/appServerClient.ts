import type { InitializeResponse } from "../../generated/app-server/InitializeResponse";
import type { CollaborationMode } from "../../generated/app-server/CollaborationMode";
import type { FuzzyFileSearchParams } from "../../generated/app-server/FuzzyFileSearchParams";
import type { FuzzyFileSearchResponse } from "../../generated/app-server/FuzzyFileSearchResponse";
import type { FsReadDirectoryParams } from "../../generated/app-server/v2/FsReadDirectoryParams";
import type { FsReadDirectoryResponse } from "../../generated/app-server/v2/FsReadDirectoryResponse";
import type { FsReadFileParams } from "../../generated/app-server/v2/FsReadFileParams";
import type { FsReadFileResponse } from "../../generated/app-server/v2/FsReadFileResponse";
import type { ListMcpServerStatusParams } from "../../generated/app-server/v2/ListMcpServerStatusParams";
import type { ListMcpServerStatusResponse } from "../../generated/app-server/v2/ListMcpServerStatusResponse";
import type { SkillsListParams } from "../../generated/app-server/v2/SkillsListParams";
import type { SkillsListResponse } from "../../generated/app-server/v2/SkillsListResponse";
import type { ThreadArchiveParams } from "../../generated/app-server/v2/ThreadArchiveParams";
import type { ThreadArchiveResponse } from "../../generated/app-server/v2/ThreadArchiveResponse";
import type { ThreadDeleteParams } from "../../generated/app-server/v2/ThreadDeleteParams";
import type { ThreadDeleteResponse } from "../../generated/app-server/v2/ThreadDeleteResponse";
import type { ThreadCompactStartParams } from "../../generated/app-server/v2/ThreadCompactStartParams";
import type { ThreadCompactStartResponse } from "../../generated/app-server/v2/ThreadCompactStartResponse";
import type { ThreadGoalClearParams } from "../../generated/app-server/v2/ThreadGoalClearParams";
import type { ThreadGoalClearResponse } from "../../generated/app-server/v2/ThreadGoalClearResponse";
import type { ThreadGoalGetParams } from "../../generated/app-server/v2/ThreadGoalGetParams";
import type { ThreadGoalGetResponse } from "../../generated/app-server/v2/ThreadGoalGetResponse";
import type { ThreadGoalSetParams } from "../../generated/app-server/v2/ThreadGoalSetParams";
import type { ThreadGoalSetResponse } from "../../generated/app-server/v2/ThreadGoalSetResponse";
import type { ThreadListParams } from "../../generated/app-server/v2/ThreadListParams";
import type { ThreadListResponse } from "../../generated/app-server/v2/ThreadListResponse";
import type { ThreadMetadataUpdateParams } from "../../generated/app-server/v2/ThreadMetadataUpdateParams";
import type { ThreadMetadataUpdateResponse } from "../../generated/app-server/v2/ThreadMetadataUpdateResponse";
import type { ThreadResumeParams } from "../../generated/app-server/v2/ThreadResumeParams";
import type { ThreadResumeResponse } from "../../generated/app-server/v2/ThreadResumeResponse";
import type { ThreadStartParams } from "../../generated/app-server/v2/ThreadStartParams";
import type { ThreadStartResponse } from "../../generated/app-server/v2/ThreadStartResponse";
import type { ThreadSetNameParams } from "../../generated/app-server/v2/ThreadSetNameParams";
import type { ThreadSetNameResponse } from "../../generated/app-server/v2/ThreadSetNameResponse";
import type { TurnInterruptParams } from "../../generated/app-server/v2/TurnInterruptParams";
import type { TurnInterruptResponse } from "../../generated/app-server/v2/TurnInterruptResponse";
import type { TurnStartParams } from "../../generated/app-server/v2/TurnStartParams";
import type { TurnStartResponse } from "../../generated/app-server/v2/TurnStartResponse";
import { asError, errorMessage } from "../../shared/errors";
import {
  TauriAppServerTransport,
  type AppServerTransport,
  type DisposeListener,
} from "./appServerTransport";

type JsonRpcId = number | string;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type AppServerClientStatus = "stopped" | "starting" | "ready" | "stopping";

interface JsonRpcMessage {
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: JsonValue };
}

interface PendingRequest {
  method: string;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

type NotificationHandler = (params: unknown) => void;
type LogHandler = (line: string) => void;
type ReverseRequestHandler = (params: unknown) => Promise<JsonValue>;
type ProtocolErrorHandler = (error: Error) => void;

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMessage(raw: string): JsonRpcMessage {
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value)) throw new Error("app-server 返回的 JSON-RPC 消息不是对象");
  if (value.id !== undefined && typeof value.id !== "number" && typeof value.id !== "string") {
    throw new Error("app-server 返回了无效的 JSON-RPC id");
  }
  if (value.method !== undefined && typeof value.method !== "string") {
    throw new Error("app-server 返回了无效的 JSON-RPC method");
  }
  return value as JsonRpcMessage;
}

export class AppServerClient {
  private nextId = 1;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private notificationHandlers = new Map<string, Set<NotificationHandler>>();
  private logHandlers = new Set<LogHandler>();
  private reverseRequestHandlers = new Map<string, ReverseRequestHandler>();
  private protocolErrorHandlers = new Set<ProtocolErrorHandler>();
  private disposeTransportListeners: DisposeListener[] = [];
  private startPromise: Promise<void> | null = null;
  private status: AppServerClientStatus = "stopped";
  private initializeResponse: InitializeResponse | null = null;

  constructor(
    private readonly transport: AppServerTransport = new TauriAppServerTransport(),
    private readonly requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  ) {}

  get connectionStatus() {
    return this.status;
  }

  get serverInfo() {
    return this.initializeResponse;
  }

  async start() {
    if (this.status === "ready") return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.startConnection();
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async stop() {
    if (this.startPromise) await this.startPromise.catch(() => undefined);
    if (this.status === "stopped") return;
    this.status = "stopping";
    try {
      await this.transport.stop();
    } finally {
      this.handleStopped(new Error("app-server 已停止"));
    }
  }

  request<T>(method: string, params?: unknown) {
    if (this.status !== "ready") {
      return Promise.reject(new Error("app-server 尚未完成初始化"));
    }
    return this.requestRaw<T>(method, params);
  }

  onNotification(method: string, handler: NotificationHandler) {
    const handlers = this.notificationHandlers.get(method) ?? new Set();
    handlers.add(handler);
    this.notificationHandlers.set(method, handlers);
    return () => handlers.delete(handler);
  }

  onLog(handler: LogHandler) {
    this.logHandlers.add(handler);
    return () => this.logHandlers.delete(handler);
  }

  onReverseRequest(method: string, handler: ReverseRequestHandler) {
    this.reverseRequestHandlers.set(method, handler);
    return () => this.reverseRequestHandlers.delete(method);
  }

  onProtocolError(handler: ProtocolErrorHandler) {
    this.protocolErrorHandlers.add(handler);
    return () => this.protocolErrorHandlers.delete(handler);
  }

  listThreads(params: ThreadListParams = {}) {
    return this.request<ThreadListResponse>("thread/list", params);
  }

  resumeThread(params: ThreadResumeParams) {
    return this.request<ThreadResumeResponse>("thread/resume", params);
  }

  startThread(params: ThreadStartParams) {
    return this.request<ThreadStartResponse>("thread/start", params);
  }

  setThreadName(params: ThreadSetNameParams) {
    return this.request<ThreadSetNameResponse>("thread/name/set", params);
  }

  updateThreadMetadata(params: ThreadMetadataUpdateParams) {
    return this.request<ThreadMetadataUpdateResponse>("thread/metadata/update", params);
  }

  archiveThread(params: ThreadArchiveParams) {
    return this.request<ThreadArchiveResponse>("thread/archive", params);
  }

  deleteThread(params: ThreadDeleteParams) {
    return this.request<ThreadDeleteResponse>("thread/delete", params);
  }

  compactThread(params: ThreadCompactStartParams) {
    return this.request<ThreadCompactStartResponse>("thread/compact/start", params);
  }

  getThreadGoal(params: ThreadGoalGetParams) {
    return this.request<ThreadGoalGetResponse>("thread/goal/get", params);
  }

  setThreadGoal(params: ThreadGoalSetParams) {
    return this.request<ThreadGoalSetResponse>("thread/goal/set", params);
  }

  clearThreadGoal(params: ThreadGoalClearParams) {
    return this.request<ThreadGoalClearResponse>("thread/goal/clear", params);
  }

  listSkills(params: SkillsListParams = {}) {
    return this.request<SkillsListResponse>("skills/list", params);
  }

  listMcpServers(params: ListMcpServerStatusParams = {}) {
    return this.request<ListMcpServerStatusResponse>("mcpServerStatus/list", params);
  }

  fuzzyFileSearch(params: FuzzyFileSearchParams) {
    return this.request<FuzzyFileSearchResponse>("fuzzyFileSearch", params);
  }

  readDirectory(params: FsReadDirectoryParams) {
    return this.request<FsReadDirectoryResponse>("fs/readDirectory", params);
  }

  readFile(params: FsReadFileParams) {
    return this.request<FsReadFileResponse>("fs/readFile", params);
  }

  startTurn(params: TurnStartParams, collaborationMode?: CollaborationMode) {
    return this.request<TurnStartResponse>(
      "turn/start",
      collaborationMode ? { ...params, collaborationMode } : params,
    );
  }

  interruptTurn(params: TurnInterruptParams) {
    return this.request<TurnInterruptResponse>("turn/interrupt", params);
  }

  private async startConnection() {
    this.status = "starting";
    await this.attachTransportListeners();
    try {
      await this.transport.start();
      this.initializeResponse = await this.requestRaw<InitializeResponse>("initialize", {
        clientInfo: { name: "codex-shell", title: "Codex Shell", version: "0.1.0" },
        capabilities: { experimentalApi: true },
      });
      if (this.connectionStatus === "stopped") throw new Error("app-server 在初始化期间退出");
      await this.send({ method: "initialized" });
      this.status = "ready";
    } catch (error) {
      const connectionError = asError(error);
      await this.transport.stop().catch(() => undefined);
      this.handleStopped(connectionError);
      throw connectionError;
    }
  }

  private requestRaw<T>(method: string, params?: unknown) {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`app-server 请求超时：${method}`));
      }, this.requestTimeoutMs);
      this.pending.set(id, { method, resolve: (value) => resolve(value as T), reject, timeout });
      this.send({ id, method, params }).catch((error: unknown) => {
        const pending = this.pending.get(id);
        if (!pending) return;
        clearTimeout(pending.timeout);
        this.pending.delete(id);
        reject(asError(error));
      });
    });
  }

  private send(message: JsonRpcMessage) {
    return this.transport.send(JSON.stringify(message));
  }

  private receive(raw: string) {
    let message: JsonRpcMessage;
    try {
      message = parseMessage(raw);
    } catch (error) {
      this.emitProtocolError(new Error(`无法解析 app-server 消息：${asError(error).message}`));
      return;
    }

    if (message.id !== undefined && !message.method) {
      const pending = this.pending.get(message.id);
      if (!pending) {
        this.emitProtocolError(new Error(`收到未知 JSON-RPC 响应：${message.id}`));
        return;
      }
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result ?? null);
      return;
    }

    if (message.method && message.id !== undefined) {
      void this.handleReverseRequest(message);
      return;
    }

    if (message.method) {
      this.notificationHandlers.get(message.method)?.forEach((handler) => handler(message.params));
    }
  }

  private handleStopped(reason: Error) {
    const shouldNotify = this.status !== "stopped" || this.pending.size > 0;
    this.status = "stopped";
    this.initializeResponse = null;
    this.disposeListeners();
    for (const request of this.pending.values()) {
      clearTimeout(request.timeout);
      request.reject(new Error(`${reason.message}（等待：${request.method}）`));
    }
    this.pending.clear();
    if (shouldNotify) {
      this.notificationHandlers.get("app-server/stopped")?.forEach((handler) => handler(undefined));
    }
  }

  private disposeListeners() {
    this.disposeTransportListeners.forEach((dispose) => dispose());
    this.disposeTransportListeners = [];
  }

  private async attachTransportListeners() {
    this.disposeListeners();
    const messageListener = await this.transport.onMessage((line) => this.receive(line));
    this.disposeTransportListeners.push(messageListener);
    try {
      const logListener = await this.transport.onLog((line) => {
        this.logHandlers.forEach((handler) => handler(line));
      });
      this.disposeTransportListeners.push(logListener);
      const stoppedListener = await this.transport.onStopped(() => {
        this.handleStopped(new Error("app-server 意外退出"));
      });
      this.disposeTransportListeners.push(stoppedListener);
    } catch (error) {
      this.disposeListeners();
      throw error;
    }
  }

  private emitProtocolError(error: Error) {
    this.protocolErrorHandlers.forEach((handler) => handler(error));
  }

  private async handleReverseRequest(message: JsonRpcMessage) {
    const handler = this.reverseRequestHandlers.get(message.method ?? "");
    try {
      if (!handler) throw new Error(`客户端尚未处理反向请求：${message.method}`);
      const result = await handler(message.params);
      await this.send({ id: message.id, result });
    } catch (error) {
      await this.send({
        id: message.id,
        error: { code: -32603, message: errorMessage(error) },
      }).catch(() => undefined);
    }
  }
}
