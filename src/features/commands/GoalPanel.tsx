import { useEffect, useState } from "react";
import type { ThreadGoal } from "../../generated/app-server/v2/ThreadGoal";

interface Props {
  getGoal: () => Promise<ThreadGoal | null>;
  setGoal: (objective: string) => Promise<ThreadGoal>;
  clearGoal: () => Promise<boolean>;
  onClose: () => void;
}

export function GoalPanel({ getGoal, setGoal, clearGoal, onClose }: Props) {
  const [goal, setCurrentGoal] = useState<ThreadGoal | null>(null);
  const [objective, setObjective] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getGoal().then((value) => { setCurrentGoal(value); setObjective(value?.objective ?? ""); }).catch((value) => setError(value instanceof Error ? value.message : String(value))).finally(() => setLoading(false));
  }, [getGoal]);

  async function save() {
    if (!objective.trim() || saving) return;
    setSaving(true); setError("");
    try { setCurrentGoal(await setGoal(objective.trim())); }
    catch (value) { setError(value instanceof Error ? value.message : String(value)); }
    finally { setSaving(false); }
  }

  async function clear() {
    if (saving) return;
    setSaving(true); setError("");
    try { await clearGoal(); setCurrentGoal(null); setObjective(""); }
    catch (value) { setError(value instanceof Error ? value.message : String(value)); }
    finally { setSaving(false); }
  }

  return <div className="agent-command-panel goal-panel">
    <header><div><strong>长期目标</strong><small>{goal ? `状态：${goal.status} · 已用 ${goal.tokensUsed} tokens` : "当前 Session 尚未设置目标"}</small></div><button onClick={onClose}>×</button></header>
    <div className="goal-editor">
      <textarea autoFocus value={objective} disabled={loading || saving} onChange={(event) => setObjective(event.target.value)} placeholder="输入需要持续推进的目标…" />
      {error && <p>{error}</p>}
      <div><button className="secondary-button" disabled={!goal || saving} onClick={() => void clear()}>清除</button><button className="primary-button" disabled={!objective.trim() || saving} onClick={() => void save()}>{saving ? "保存中…" : "保存目标"}</button></div>
    </div>
  </div>;
}
