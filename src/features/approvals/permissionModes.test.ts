import { describe, expect, it } from "vitest";
import { DEFAULT_PERMISSION_MODE, getPermissionMode } from "./permissionModes";

describe("default permission mode", () => {
  it("starts new sessions with unrestricted local access and no approval prompts", () => {
    expect(getPermissionMode(DEFAULT_PERMISSION_MODE)).toMatchObject({
      id: "full",
      approvalPolicy: "never",
      sandbox: "danger-full-access",
    });
  });
});
