import type {
  AppServerOutput,
  AppServerProcess,
  AppServerTransport,
  DisposeListener,
} from "./appServerTransport";

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
  startedProcesses: AppServerProcess[] = [];
  private messageHandlers = new Set<(output: AppServerOutput) => void>();
  private logHandlers = new Set<(output: AppServerOutput) => void>();
  private stoppedHandlers = new Set<(process: AppServerProcess) => void>();

  async start() {
    this.startCount += 1;
    const process = { processId: 1000 + this.startCount, generation: this.startCount };
    this.startedProcesses.push(process);
    return process;
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

  async onMessage(handler: (output: AppServerOutput) => void): Promise<DisposeListener> {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  async onLog(handler: (output: AppServerOutput) => void): Promise<DisposeListener> {
    this.logHandlers.add(handler);
    return () => this.logHandlers.delete(handler);
  }

  async onStopped(handler: (process: AppServerProcess) => void): Promise<DisposeListener> {
    this.stoppedHandlers.add(handler);
    return () => this.stoppedHandlers.delete(handler);
  }

  emit(message: unknown, process = this.startedProcesses[this.startedProcesses.length - 1]) {
    if (!process) throw new Error("app-server has not been started");
    const line = typeof message === "string" ? message : JSON.stringify(message);
    this.messageHandlers.forEach((handler) => handler({ ...process, line }));
  }

  emitStopped(process = this.startedProcesses[this.startedProcesses.length - 1]) {
    if (!process) throw new Error("app-server has not been started");
    this.stoppedHandlers.forEach((handler) => handler(process));
  }

  emitLog(line: string, process = this.startedProcesses[this.startedProcesses.length - 1]) {
    if (!process) throw new Error("app-server has not been started");
    this.logHandlers.forEach((handler) => handler({ ...process, line }));
  }
}
