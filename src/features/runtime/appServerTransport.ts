import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type DisposeListener = () => void;

export interface AppServerTransport {
  start(): Promise<number>;
  stop(): Promise<void>;
  send(line: string): Promise<void>;
  onMessage(handler: (line: string) => void): Promise<DisposeListener>;
  onStopped(handler: () => void): Promise<DisposeListener>;
}

export class TauriAppServerTransport implements AppServerTransport {
  start() {
    return invoke<number>("app_server_start");
  }

  stop() {
    return invoke<void>("app_server_stop");
  }

  send(line: string) {
    return invoke<void>("app_server_send", { line });
  }

  onMessage(handler: (line: string) => void) {
    return listen<string>("app-server://message", (event) => handler(event.payload));
  }

  onStopped(handler: () => void) {
    return listen("app-server://stopped", handler);
  }
}
