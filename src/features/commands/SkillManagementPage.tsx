import { useEffect, useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import { errorMessage } from "../../shared/errors";
import type { SkillMention } from "../runtime/useAgentSession";
import "./CommandPanels.css";

interface Props {
  loadSkills: (forceReload?: boolean) => Promise<SkillMetadata[]>;
  disabledPaths: string[];
  onToggleDisabled: (skill: SkillMention) => void;
  onClose: () => void;
}

export function SkillManagementPage({ loadSkills, disabledPaths, onToggleDisabled, onClose }: Props) {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { void loadSkills().then(setSkills).catch((value) => setError(errorMessage(value))); }, [loadSkills]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? skills.filter((skill) => `${skill.name} ${skill.description}`.toLocaleLowerCase().includes(normalized)) : skills;
  }, [query, skills]);
  return <div className="skill-management-page">
    <header className="skill-management-header"><div><h1>Skills</h1><p>在你常用的工具中使用 Codex</p></div><button type="button" onClick={onClose}>返回会话</button></header>
    <div className="skill-management-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skills" /></div>
    <div className="skill-management-section"><h2>已安装</h2>{error && <p className="error">{error}</p>}{!error && filtered.map((skill) => {
      const disabled = disabledPaths.includes(skill.path);
      return <article className={`skill-management-card ${disabled ? "disabled" : ""}`} key={skill.path}>
        <span className="skill-management-icon"><Sparkles aria-hidden="true" /></span><div><strong>{skill.interface?.displayName || skill.name}</strong><p>{skill.interface?.shortDescription || skill.shortDescription || skill.description}</p></div>
        <button type="button" className="skill-management-toggle" onClick={() => onToggleDisabled({ name: skill.name, path: skill.path })}>{disabled ? "启用" : <><Check aria-hidden="true" />已启用</>}</button>
      </article>;
    })}</div>
  </div>;
}
