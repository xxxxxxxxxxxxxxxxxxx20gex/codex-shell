import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ThreadResumeParams } from "../../generated/app-server/v2/ThreadResumeParams";
import type { ThreadResumeResponse } from "../../generated/app-server/v2/ThreadResumeResponse";
import type { ThreadStartParams } from "../../generated/app-server/v2/ThreadStartParams";
import type { ThreadStartResponse } from "../../generated/app-server/v2/ThreadStartResponse";
import type { TurnInterruptParams } from "../../generated/app-server/v2/TurnInterruptParams";
import type { TurnInterruptResponse } from "../../generated/app-server/v2/TurnInterruptResponse";
import type { TurnStartParams } from "../../generated/app-server/v2/TurnStartParams";
import type { TurnStartResponse } from "../../generated/app-server/v2/TurnStartResponse";

type JsonRpcId = number | string;
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

interface JsonRpcMessage {
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: JsonValue };
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export type NotificationHandler = (params: unknown) => void;
export type ReverseRequestHandler = (params: unknown) => Promise<JsonValue>;

export class AppServerClient {
  private nextId = 1;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private notificationHandlers = new Map<string, Set<NotificationHandler>>();
  private reverseRequestHandlers = new Map<string, ReverseRequestHandler>();
  private unlisten: UnlistenFn[] = [];

  async start() {
    this.unlisten.push(await listen<string>("app-server://message", (event) => this.receive(event.payload)));
    await invoke<number>("app_server_start");
    await this.request("initialize", {
      clientInfo: { name: "codex-shell", title: "Codex Shell", version: "0.1.0" },
      capabilities: { experimentalApi: false },
    });
    await this.notify("initialized");
  }

  async stop() {
    await invoke("app_server_stop");
    this.unlisten.forEach((dispose) => dispose());
    this.unlisten = [];
    for (const request of this.pending.values()) request.reject(new Error("app-server 已停止"));
    this.pending.clear();
  }

  request<T>(method: string, params?: unknown) {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      this.send({ id, method, params }).catch((error: unknown) => {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  notify(method: string, params?: JsonValue) {
    return this.send({ method, params });
  }

  onNotification(method: string, handler: NotificationHandler) {
    const handlers = this.notificationHandlers.get(method) ?? new Set();
    handlers.add(handler);
    this.notificationHandlers.set(method, handlers);
    return () => handlers.delete(handler);
  }

  onReverseRequest(method: string, handler: ReverseRequestHandler) {
    this.reverseRequestHandlers.set(method, handler);
    return () => this.reverseRequestHandlers.delete(method);
  }

  startThread(params: ThreadStartParams) {
    return this.request<ThreadStartResponse>("thread/start", params);
  }

  resumeThread(params: ThreadResumeParams) {
    return this.request<ThreadResumeResponse>("thread/resume", params);
  }

  startTurn(params: TurnStartParams) {
    return this.request<TurnStartResponse>("turn/start", params);
  }

  interruptTurn(params: TurnInterruptParams) {
    return this.request<TurnInterruptResponse>("turn/interrupt", params);
  }

  private send(message: JsonRpcMessage) {
    return invoke("app_server_send", { line: JSON.stringify(message) });
  }

  private receive(raw: string) {
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(raw) as JsonRpcMessage;
    } catch {
      return;
    }

    if (message.id !== undefined && !message.method) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
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

  private async handleReverseRequest(message: JsonRpcMessage) {
    const handler = this.reverseRequestHandlers.get(message.method ?? "");
    try {
      if (!handler) throw new Error(`客户端尚未处理反向请求：${message.method}`);
      const result = await handler(message.params);
      await this.send({ id: message.id, result });
    } catch (error) {
      await this.send({
        id: message.id,
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}
