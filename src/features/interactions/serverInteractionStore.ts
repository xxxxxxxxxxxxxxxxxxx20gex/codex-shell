import type { GrantedPermissionProfile } from "../../generated/app-server/v2/GrantedPermissionProfile";
import type { CommandExecutionRequestApprovalParams } from "../../generated/app-server/v2/CommandExecutionRequestApprovalParams";
import type { FileChangeRequestApprovalParams } from "../../generated/app-server/v2/FileChangeRequestApprovalParams";
import type { McpServerElicitationRequestParams } from "../../generated/app-server/v2/McpServerElicitationRequestParams";
import type { PermissionsRequestApprovalParams } from "../../generated/app-server/v2/PermissionsRequestApprovalParams";
import type { ToolRequestUserInputParams } from "../../generated/app-server/v2/ToolRequestUserInputParams";
import {
  REVERSE_REQUEST_DISMISSED,
  type JsonRpcId,
  type JsonValue,
  type ReverseRequestResult,
} from "../runtime/appServerClient";

export type ApprovalScope = "turn" | "session";

export type ServerInteractionPayload =
  | { kind: "commandApproval"; params: CommandExecutionRequestApprovalParams }
  | { kind: "fileChangeApproval"; params: FileChangeRequestApprovalParams }
  | { kind: "permissionsApproval"; params: PermissionsRequestApprovalParams }
  | { kind: "userInput"; params: ToolRequestUserInputParams }
  | { kind: "mcpElicitation"; params: McpServerElicitationRequestParams };

export type ServerInteraction = ServerInteractionPayload & { requestId: JsonRpcId };

const MAX_PENDING_INTERACTIONS = 32;

function declineResult(interaction: ServerInteraction): JsonValue {
  switch (interaction.kind) {
    case "permissionsApproval":
      return { permissions: {}, scope: "turn" };
    case "commandApproval":
    case "fileChangeApproval":
      return { decision: "decline" };
    case "userInput":
      return { answers: {} };
    case "mcpElicitation":
      return { action: "decline", content: null, _meta: null };
  }
}

export class ServerInteractionStore {
  private entries: ServerInteraction[] = [];
  private listeners = new Set<() => void>();
  private resolvers = new Map<JsonRpcId, (result: ReverseRequestResult) => void>();

  getSnapshot = () => this.entries;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  request = (requestId: JsonRpcId, payload: ServerInteractionPayload) => (
    new Promise<ReverseRequestResult>((resolve) => {
      this.dismiss(requestId);
      if (this.entries.length >= MAX_PENDING_INTERACTIONS) {
        const oldest = this.entries[0];
        this.resolve(oldest.requestId, declineResult(oldest));
      }
      this.resolvers.set(requestId, resolve);
      this.entries = [...this.entries, { ...payload, requestId } as ServerInteraction];
      this.emitChange();
    })
  );

  approveCurrent = (scope: ApprovalScope) => {
    const interaction = this.entries[0];
    if (!interaction) return;
    if (interaction.kind === "commandApproval" || interaction.kind === "fileChangeApproval") {
      this.resolve(interaction.requestId, {
        decision: scope === "session" ? "acceptForSession" : "accept",
      });
      return;
    }
    if (interaction.kind !== "permissionsApproval") return;

    const granted: GrantedPermissionProfile = {};
    if (interaction.params.permissions.network) {
      granted.network = interaction.params.permissions.network;
    }
    if (interaction.params.permissions.fileSystem) {
      granted.fileSystem = interaction.params.permissions.fileSystem;
    }
    this.resolve(interaction.requestId, { permissions: granted as JsonValue, scope });
  };

  declineCurrent = () => {
    const interaction = this.entries[0];
    if (interaction) this.resolve(interaction.requestId, declineResult(interaction));
  };

  resolveCurrent = (result: JsonValue) => {
    const interaction = this.entries[0];
    if (interaction) this.resolve(interaction.requestId, result);
  };

  dismiss = (requestId: JsonRpcId) => {
    const resolver = this.resolvers.get(requestId);
    if (!resolver) return;
    this.resolvers.delete(requestId);
    this.entries = this.entries.filter((entry) => entry.requestId !== requestId);
    resolver(REVERSE_REQUEST_DISMISSED);
    this.emitChange();
  };

  clear = () => {
    if (this.resolvers.size === 0 && this.entries.length === 0) return;
    this.resolvers.forEach((resolve) => resolve(REVERSE_REQUEST_DISMISSED));
    this.resolvers.clear();
    this.entries = [];
    this.emitChange();
  };

  dispose = () => {
    this.clear();
    this.listeners.clear();
  };

  private resolve(requestId: JsonRpcId, result: ReverseRequestResult) {
    const resolver = this.resolvers.get(requestId);
    if (!resolver) return;
    this.resolvers.delete(requestId);
    this.entries = this.entries.filter((entry) => entry.requestId !== requestId);
    resolver(result);
    this.emitChange();
  }

  private emitChange() {
    this.listeners.forEach((listener) => listener());
  }
}
