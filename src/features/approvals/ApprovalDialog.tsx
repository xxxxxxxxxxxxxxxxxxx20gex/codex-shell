import type { PendingApproval } from "../runtime/useAgentSession";

interface Props {
  approval: PendingApproval;
  onApprove: (scope: "turn" | "session") => void;
  onDecline: () => void;
}

function permissionLines(approval: PendingApproval) {
  if (approval.kind === "command") {
    return [
      approval.params.command && `命令：${approval.params.command}`,
      approval.params.cwd && `目录：${approval.params.cwd}`,
      approval.params.reason && `原因：${approval.params.reason}`,
    ].filter(Boolean) as string[];
  }

  if (approval.kind === "fileChange") {
    return [
      approval.params.grantRoot && `写入目录：${approval.params.grantRoot}`,
      approval.params.reason && `原因：${approval.params.reason}`,
    ].filter(Boolean) as string[];
  }

  const fileSystem = approval.params.permissions.fileSystem;
  return [
    `当前目录：${approval.params.cwd}`,
    approval.params.reason && `原因：${approval.params.reason}`,
    fileSystem?.read?.length && `读取：${fileSystem.read.join("、")}`,
    fileSystem?.write?.length && `写入：${fileSystem.write.join("、")}`,
    approval.params.permissions.network?.enabled && "网络：允许访问",
  ].filter(Boolean) as string[];
}

function title(approval: PendingApproval) {
  if (approval.kind === "command") return "允许执行命令？";
  if (approval.kind === "fileChange") return "允许修改文件？";
  return "允许额外权限？";
}

export function ApprovalDialog({ approval, onApprove, onDecline }: Props) {
  return (
    <div className="approval-backdrop" role="presentation">
      <section className="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="approval-title">
        <span className="eyebrow">需要你的确认</span>
        <h2 id="approval-title">{title(approval)}</h2>
        <p>Codex 请求在当前任务中执行受保护操作。请核对范围后再允许。</p>
        <div className="approval-details">
          {permissionLines(approval).map((line) => <code key={line}>{line}</code>)}
        </div>
        <footer>
          <button className="secondary-button danger-button" onClick={onDecline}>拒绝</button>
          <button className="secondary-button" onClick={() => onApprove("turn")}>仅本次允许</button>
          <button className="primary-button" onClick={() => onApprove("session")}>本会话允许</button>
        </footer>
      </section>
    </div>
  );
}
