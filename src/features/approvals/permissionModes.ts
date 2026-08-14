import type { ApprovalsReviewer } from "../../generated/app-server/v2/ApprovalsReviewer";
import type { AskForApproval } from "../../generated/app-server/v2/AskForApproval";
import type { SandboxMode } from "../../generated/app-server/v2/SandboxMode";
import type { SandboxPolicy } from "../../generated/app-server/v2/SandboxPolicy";

export type PermissionMode = "read" | "workspace" | "full";
export type ApprovalReviewerMode = Extract<ApprovalsReviewer, "user" | "auto_review">;

export const DEFAULT_PERMISSION_MODE: PermissionMode = "full";
export const DEFAULT_APPROVAL_REVIEWER: ApprovalReviewerMode = "user";

export interface PermissionModeConfig {
  id: PermissionMode;
  label: string;
  description: string;
  approvalPolicy: AskForApproval;
  sandbox: SandboxMode;
}

export const PERMISSION_MODES: PermissionModeConfig[] = [
  {
    id: "read",
    label: "只读",
    description: "读取项目；写入或扩大访问时请求批准",
    approvalPolicy: "on-request",
    sandbox: "read-only",
  },
  {
    id: "workspace",
    label: "工作区写入",
    description: "可修改当前项目；项目外操作请求批准",
    approvalPolicy: "on-request",
    sandbox: "workspace-write",
  },
  {
    id: "full",
    label: "完全访问",
    description: "访问本机文件和网络，不再请求批准",
    approvalPolicy: "never",
    sandbox: "danger-full-access",
  },
];

export function getPermissionMode(id: PermissionMode) {
  return PERMISSION_MODES.find((mode) => mode.id === id) ?? PERMISSION_MODES[0];
}

export function getTurnSandboxPolicy(id: PermissionMode): SandboxPolicy {
  switch (id) {
    case "read":
      return { type: "readOnly", networkAccess: false };
    case "workspace":
      return {
        type: "workspaceWrite",
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      };
    case "full":
      return { type: "dangerFullAccess" };
  }
}

export function getApprovalsReviewer(
  permissionMode: PermissionMode,
  reviewer: ApprovalReviewerMode,
): ApprovalsReviewer {
  return permissionMode === "full" ? "user" : reviewer;
}
