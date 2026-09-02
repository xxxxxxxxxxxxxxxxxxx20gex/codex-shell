// GENERATED CODE! DO NOT MODIFY BY HAND!
import type { ReasoningEffort } from "../ReasoningEffort";
import type { ReasoningSummary } from "../ReasoningSummary";
import type { AskForApproval } from "./AskForApproval";
import type { ApprovalsReviewer } from "./ApprovalsReviewer";
import type { SandboxPolicy } from "./SandboxPolicy";
export type ThreadSettingsUpdateParams = { threadId: string, cwd?: string | null, approvalPolicy?: AskForApproval | null, approvalsReviewer?: ApprovalsReviewer | null, sandboxPolicy?: SandboxPolicy | null, permissions?: string | null, model?: string | null, serviceTier?: string | null, effort?: ReasoningEffort | null, summary?: ReasoningSummary | null, };
