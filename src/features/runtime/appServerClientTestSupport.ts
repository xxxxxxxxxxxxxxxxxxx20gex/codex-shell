import type { AppServerTransport, DisposeListener } from "./appServerTransport";

export interface SentMessage {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

export class FakeTransport implements AppServerTransport {
  startCount = 0;
  stopCount = 0;
  sent: SentMessage[] = [];
  private messageHandlers = new Set<(line: string) => void>();
  private logHandlers = new Set<(line: string) => void>();
  private stoppedHandlers = new Set<() => void>();

  async start() {
    this.startCount += 1;
    return 1000 + this.startCount;
  }

  async stop() {
    this.stopCount += 1;
  }

  async send(line: string) {
    const message = JSON.parse(line) as SentMessage;
    this.sent.push(message);
    if (message.method === "initialize" && message.id !== undefined) {
      this.emit({
        id: message.id,
        result: {
          userAgent: "test",
          codexHome: "C:\\app\\codex-home",
          platformFamily: "windows",
          platformOs: "windows",
        },
      });
    }
  }

  async onMessage(handler: (line: string) => void): Promise<DisposeListener> {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  async onLog(handler: (line: string) => void): Promise<DisposeListener> {
    this.logHandlers.add(handler);
    return () => this.logHandlers.delete(handler);
  }

  async onStopped(handler: () => void): Promise<DisposeListener> {
    this.stoppedHandlers.add(handler);
    return () => this.stoppedHandlers.delete(handler);
  }

  emit(message: unknown) {
    const line = typeof message === "string" ? message : JSON.stringify(message);
    this.messageHandlers.forEach((handler) => handler(line));
  }

  emitStopped() {
    this.stoppedHandlers.forEach((handler) => handler());
  }

  emitLog(line: string) {
    this.logHandlers.forEach((handler) => handler(line));
  }
}
