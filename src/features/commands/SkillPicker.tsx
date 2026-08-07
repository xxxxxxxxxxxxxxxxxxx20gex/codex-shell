import { useEffect, useMemo, useState } from "react";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import type { SkillMention } from "../runtime/useAgentSession";

interface Props {
  selected: SkillMention[];
  loadSkills: (forceReload?: boolean) => Promise<SkillMetadata[]>;
  onToggle: (skill: SkillMention) => void;
  onClose: () => void;
}

export function SkillPicker({ selected, loadSkills, onToggle, onClose }: Props) {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSkills().then(setSkills).catch((value) => setError(value instanceof Error ? value.message : String(value))).finally(() => setLoading(false));
  }, [loadSkills]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? skills.filter((skill) => skill.name.toLocaleLowerCase().includes(normalized)
      || skill.description.toLocaleLowerCase().includes(normalized)) : skills;
  }, [query, skills]);

  return <div className="agent-command-panel skill-picker">
    <header><div><strong>Skills</strong><small>选择后会附加到下一条消息</small></div><button onClick={onClose}>×</button></header>
    <div className="command-filter"><span>⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skills…" /></div>
    <div className="command-panel-list">
      {loading && <p>正在读取 Skills…</p>}{error && <p className="error">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p>没有可用的 Skill。</p>}
      {filtered.map((skill) => {
        const active = selected.some((item) => item.path === skill.path);
        return <button key={skill.path} className={active ? "active" : ""} onClick={() => onToggle({ name: skill.name, path: skill.path })}>
          <i>✦</i><span><strong>{skill.interface?.displayName || skill.name}</strong><small>{skill.interface?.shortDescription || skill.shortDescription || skill.description}</small></span><em>{active ? "✓" : skill.scope}</em>
        </button>;
      })}
    </div>
  </div>;
}
