import { useEffect, useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import { errorMessage } from "../../shared/errors";
import "./CommandPanels.css";

interface Props {
  loadSkills: (forceReload?: boolean) => Promise<SkillMetadata[]>;
  revision: number;
  setEnabled: (path: string, enabled: boolean) => Promise<boolean>;
  onClose: () => void;
  onAddSkill: () => void;
}

export function SkillManagementPage({ loadSkills, revision, setEnabled, onClose, onAddSkill }: Props) {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    void loadSkills(true).then((items) => { if (active) { setSkills(items); setError(""); } }).catch((value) => { if (active) setError(errorMessage(value)); });
    return () => { active = false; };
  }, [loadSkills, revision, refresh]);
  async function toggle(skill: SkillMetadata) {
    setBusy(true);
    setError("");
    try {
      const enabled = await setEnabled(skill.path, !skill.enabled);
      setSkills((items) => items.map((item) => item.path === skill.path ? { ...item, enabled } : item));
      setSkills(await loadSkills(true));
      if (enabled === skill.enabled) setError("配置已保存，但有效状态受上层策略限制。");
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? skills.filter((skill) => `${skill.name} ${skill.description}`.toLocaleLowerCase().includes(normalized)) : skills;
  }, [query, skills]);
  return <div className="skill-management-page">
    <header className="skill-management-header"><div><h1>Skills</h1><p>按来源管理技能；变更后请新建会话使用。</p></div><div><button type="button" onClick={onAddSkill}>通过 Installer 添加</button><button type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>刷新</button><button type="button" onClick={onClose}>返回会话</button></div></header>
    <div className="skill-management-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skills" /></div>
    <div className="skill-management-section"><h2>可发现的技能</h2>{error && <p className="error" role="alert">{error}</p>}{filtered.map((skill) => {
      const disabled = !skill.enabled;
      const scopeLabel = skill.pluginId ? `插件 · ${skill.pluginId}` : ({ user: "个人", system: "系统", admin: "管理员", repo: "项目" })[skill.scope];
      return <article className={`skill-management-card ${disabled ? "disabled" : ""}`} key={skill.path}>
        <span className="skill-management-icon"><Sparkles aria-hidden="true" /></span><div><strong>{skill.interface?.displayName || skill.name}<em className="skill-scope-badge">{scopeLabel}</em></strong><p>{skill.interface?.shortDescription || skill.shortDescription || skill.description}</p></div>
        <button type="button" className="skill-management-toggle" role="switch" aria-label={`${skill.name} 启用状态`} aria-checked={skill.enabled} disabled={busy} onClick={() => void toggle(skill)}>{disabled ? "启用" : <><Check aria-hidden="true" />已启用</>}</button>
      </article>;
    })}</div>
  </div>;
}
