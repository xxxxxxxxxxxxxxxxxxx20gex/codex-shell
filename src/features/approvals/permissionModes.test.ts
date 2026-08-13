import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERMISSION_MODE,
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
      ask: getTurnSandboxPolicy("ask"),
      auto: getTurnSandboxPolicy("auto"),
      full: getTurnSandboxPolicy("full"),
    }).toEqual({
      ask: {
        type: "workspaceWrite",
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      auto: {
        type: "workspaceWrite",
        writableRoots: [],
        networkAccess: false,
        excludeTmpdirEnvVar: false,
        excludeSlashTmp: false,
      },
      full: { type: "dangerFullAccess" },
    });
  });
});
