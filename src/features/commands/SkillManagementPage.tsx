import { useEffect, useMemo, useState } from "react";
import { Check, Search, Sparkles } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import { errorMessage } from "../../shared/errors";
import "./CommandPanels.css";
import "./ExtensionManagement.css";

interface Props {
  loadSkills: (forceReload?: boolean) => Promise<SkillMetadata[]>;
  revision: number;
  codexHome: string;
  setEnabled: (path: string, enabled: boolean) => Promise<boolean>;
  onClose: () => void;
  onAddSkill: () => void;
  onChanged?: () => void;
}

export function SkillManagementPage({ loadSkills, revision, codexHome, setEnabled, onClose, onAddSkill, onChanged }: Props) {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
  async function install() {
    setBusy(true); setError("");
    try {
      const selected = await open({ directory: true, multiple: false, title: "选择包含 SKILL.md 的 Skill 目录" });
      if (typeof selected !== "string") return;
      await invoke("install_local_skill", { source: selected });
      setNotice("已安装。请新建会话使用该技能。");
      onChanged?.(); setRefresh((value) => value + 1);
    }
    catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  async function installBuiltin() {
    setBusy(true); setError("");
    try {
      const path = await invoke<string>("install_builtin_skill");
      await setEnabled(path, false);
      setNotice("image-gen 已安装，默认未启用；启用后请新建会话使用。\n");
      onChanged?.(); setRefresh((value) => value + 1);
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  async function uninstall(skill: SkillMetadata) {
    if (skill.scope !== "user" || skill.pluginId) return;
    setBusy(true); setError("");
    try {
      const recoveryPath = await invoke<string>("uninstall_local_skill", { path: skill.path });
      setNotice(`已卸载，可从以下位置恢复：${recoveryPath}`);
      onChanged?.(); setRefresh((value) => value + 1);
    }
    catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? skills.filter((skill) => `${skill.name} ${skill.description}`.toLocaleLowerCase().includes(normalized)) : skills;
  }, [query, skills]);
  return <div className="skill-management-page">
    <header className="skill-management-header"><div><h1>Skills</h1><p>按来源管理技能；变更后请新建会话使用。</p></div><div><button type="button" disabled={busy} onClick={() => void install()}>从目录安装</button><button type="button" onClick={onAddSkill}>通过 Installer 添加</button><button type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>刷新</button><button type="button" onClick={onClose}>返回会话</button></div></header>
    <div className="skill-management-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Skills" /></div>
    <div className="skill-management-section"><h2>CS 市场</h2>{!skills.some((skill) => skill.name === "image-gen") && <article className="skill-management-card"><span className="skill-management-icon"><Sparkles aria-hidden="true" /></span><div><strong>Image Gen<em className="skill-scope-badge">CS 内置市场</em></strong><p>通过兔子渠道生成商品图、海报和场景图片。</p></div><span className="skill-management-actions"><button type="button" className="skill-management-toggle" disabled={busy} onClick={() => void installBuiltin()}>安装</button></span></article>}<h2>已安装与可发现</h2>{notice && <p role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}{filtered.map((skill) => {
      const disabled = !skill.enabled;
      const scopeLabel = skill.pluginId ? `插件 · ${skill.pluginId}` : ({ user: "个人", system: "系统", admin: "管理员", repo: "项目" })[skill.scope];
      const root = `${codexHome.split("\\").join("/").replace(/\/$/, "").toLowerCase()}/skills/`;
      const relative = skill.path.split("\\").join("/").toLowerCase();
      const owned = codexHome && relative.startsWith(root) && /^[^/.][^/]*\/skill\.md$/.test(relative.slice(root.length));
      return <article className={`skill-management-card ${disabled ? "disabled" : ""}`} key={skill.path}>
        <span className="skill-management-icon"><Sparkles aria-hidden="true" /></span><div><strong>{skill.interface?.displayName || skill.name}<em className="skill-scope-badge">{scopeLabel}</em></strong><p>{skill.interface?.shortDescription || skill.shortDescription || skill.description}</p></div>
        <span className="skill-management-actions"><button type="button" className="skill-management-toggle" role="switch" aria-label={`${skill.name} 启用状态`} aria-checked={skill.enabled} disabled={busy} onClick={() => void toggle(skill)}>{disabled ? "启用" : <><Check aria-hidden="true" />已启用</>}</button>{owned && skill.scope === "user" && !skill.pluginId && <button type="button" className="skill-management-remove" title="移到 CS 的 uninstalled-skills 目录，可恢复" disabled={busy} onClick={() => void uninstall(skill)}>卸载</button>}</span>
      </article>;
    })}</div>
  </div>;
}
