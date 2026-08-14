import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERMISSION_MODE,
  getApprovalsReviewer,
  getPermissionMode,
  getTurnSandboxPolicy,
} from "./permissionModes";

describe("default permission mode", () => {
  it("starts new sessions with unrestricted local access and no approval prompts", () => {
    expect(getPermissionMode(DEFAULT_PERMISSION_MODE)).toMatchObject({
      id: "full",
      approvalPolicy: "never",
      sandbox: "danger-full-access",
    });
  });

  it("maps every UI mode to an explicit app-server Turn sandbox policy", () => {
    expect({
      read: getTurnSandboxPolicy("read"),
      workspace: getTurnSandboxPolicy("workspace"),
      full: getTurnSandboxPolicy("full"),
    }).toEqual({
      read: { type: "readOnly", networkAccess: false },
      workspace: {
        type: "workspaceWrite",
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      full: { type: "dangerFullAccess" },
    });
  });

  it("keeps approval routing independent from sandbox access", () => {
    expect(getApprovalsReviewer("read", "auto_review")).toBe("auto_review");
    expect(getApprovalsReviewer("workspace", "auto_review")).toBe("auto_review");
    expect(getApprovalsReviewer("workspace", "user")).toBe("user");
    expect(getApprovalsReviewer("full", "auto_review")).toBe("user");
  });
});
