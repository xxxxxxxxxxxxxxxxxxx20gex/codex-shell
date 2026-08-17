import { useState } from "react";
import { X } from "lucide-react";
import type { ReviewDelivery } from "../../generated/app-server/v2/ReviewDelivery";
import type { ReviewTarget } from "../../generated/app-server/v2/ReviewTarget";
import { errorMessage } from "../../shared/errors";

interface Props {
  startReview: (target: ReviewTarget, delivery: ReviewDelivery) => Promise<boolean>;
  onStarted: (delivery: ReviewDelivery) => void;
  onClose: () => void;
}

type TargetKind = "uncommittedChanges" | "baseBranch" | "commit" | "custom";

export function ReviewPanel({ startReview, onStarted, onClose }: Props) {
  const [targetKind, setTargetKind] = useState<TargetKind>("uncommittedChanges");
  const [targetValue, setTargetValue] = useState("");
  const [delivery, setDelivery] = useState<ReviewDelivery>("inline");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  function target(): ReviewTarget | null {
    const value = targetValue.trim();
    if (targetKind === "uncommittedChanges") return { type: "uncommittedChanges" };
    if (!value) return null;
    if (targetKind === "baseBranch") return { type: "baseBranch", branch: value };
    if (targetKind === "commit") return { type: "commit", sha: value, title: null };
    return { type: "custom", instructions: value };
  }

  async function submit() {
    const reviewTarget = target();
    if (!reviewTarget || starting) return;
    setStarting(true);
    setError("");
    try {
      if (await startReview(reviewTarget, delivery)) onStarted(delivery);
    } catch (startError) {
      setError(errorMessage(startError));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="agent-command-panel review-panel">
      <header><div><strong>代码审查</strong><small>复用 app-server 原生 Reviewer</small></div><button onClick={onClose} aria-label="关闭代码审查"><X aria-hidden="true" /></button></header>
      <div className="review-editor">
        <label><span>审查目标</span><select value={targetKind} onChange={(event) => setTargetKind(event.target.value as TargetKind)}>
          <option value="uncommittedChanges">当前未提交修改</option>
          <option value="baseBranch">相对基础分支</option>
          <option value="commit">指定 Commit</option>
          <option value="custom">自定义审查要求</option>
        </select></label>
        {targetKind !== "uncommittedChanges" && <label><span>{targetKind === "baseBranch" ? "基础分支" : targetKind === "commit" ? "Commit SHA" : "审查要求"}</span>{targetKind === "custom" ? <textarea value={targetValue} onChange={(event) => setTargetValue(event.target.value)} /> : <input value={targetValue} onChange={(event) => setTargetValue(event.target.value)} />}</label>}
        <label><span>输出位置</span><select value={delivery} onChange={(event) => setDelivery(event.target.value as ReviewDelivery)}><option value="inline">当前 Session</option><option value="detached">独立 Review Session</option></select></label>
        {error && <p>{error}</p>}
        <div><button className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={!target() || starting} onClick={() => void submit()}>{starting ? "正在启动…" : "开始审查"}</button></div>
      </div>
    </div>
  );
}
