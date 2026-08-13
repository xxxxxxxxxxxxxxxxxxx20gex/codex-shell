import type { ApprovalsReviewer } from "../../generated/app-server/v2/ApprovalsReviewer";
import type { AskForApproval } from "../../generated/app-server/v2/AskForApproval";
import type { SandboxMode } from "../../generated/app-server/v2/SandboxMode";
import type { SandboxPolicy } from "../../generated/app-server/v2/SandboxPolicy";

export type PermissionMode = "ask" | "auto" | "full";

export const DEFAULT_PERMISSION_MODE: PermissionMode = "full";

export interface PermissionModeConfig {
  id: PermissionMode;
  label: string;
  description: string;
  icon: string;
  approvalPolicy: AskForApproval;
  approvalsReviewer: ApprovalsReviewer;
  sandbox: SandboxMode;
}

export const PERMISSION_MODES: PermissionModeConfig[] = [
  {
    id: "ask",
    label: "请求批准",
    description: "执行受保护操作时由你确认",
    icon: "✋",
    approvalPolicy: "on-request",
    approvalsReviewer: "user",
    sandbox: "workspace-write",
  },
  {
    id: "auto",
    label: "替我审批",
    description: "由 Codex 风险审查子智能体决定",
    icon: "◈",
    approvalPolicy: "on-request",
    approvalsReviewer: "auto_review",
    sandbox: "workspace-write",
  },
  {
    id: "full",
    label: "完全访问权限",
    description: "不受限制地访问网络和本机文件",
    icon: "!",
    approvalPolicy: "never",
    approvalsReviewer: "user",
    sandbox: "danger-full-access",
  },
];

export function getPermissionMode(id: PermissionMode) {
  return PERMISSION_MODES.find((mode) => mode.id === id) ?? PERMISSION_MODES[0];
}

export function getTurnSandboxPolicy(id: PermissionMode): SandboxPolicy {
  return id === "full"
    ? { type: "dangerFullAccess" }
    : {
        type: "workspaceWrite",
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      };
}
