import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type DisposeListener = () => void;

export interface AppServerProcess {
  processId: number;
  generation: number;
}

export interface AppServerOutput extends AppServerProcess {
  line: string;
}

export interface AppServerTransport {
  start(): Promise<AppServerProcess>;
  stop(): Promise<void>;
  send(line: string): Promise<void>;
  onMessage(handler: (output: AppServerOutput) => void): Promise<DisposeListener>;
  onLog(handler: (output: AppServerOutput) => void): Promise<DisposeListener>;
  onStopped(handler: (process: AppServerProcess) => void): Promise<DisposeListener>;
}

export class TauriAppServerTransport implements AppServerTransport {
  start() {
    return invoke<AppServerProcess>("app_server_start");
  }

  stop() {
    return invoke<void>("app_server_stop");
  }

  send(line: string) {
    return invoke<void>("app_server_send", { line });
  }

  onMessage(handler: (output: AppServerOutput) => void) {
    return listen<AppServerOutput>("app-server://message", (event) => handler(event.payload));
  }

  onLog(handler: (output: AppServerOutput) => void) {
    return listen<AppServerOutput>("app-server://log", (event) => handler(event.payload));
  }

  onStopped(handler: (process: AppServerProcess) => void) {
    return listen<AppServerProcess>("app-server://stopped", (event) => handler(event.payload));
  }
}
