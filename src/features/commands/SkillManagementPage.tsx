import { useEffect, useState } from "react";
import { BookOpen, MapPin, Search, Sparkles } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import { errorMessage } from "../../shared/errors";
import "./CommandPanels.css";
import "./ExtensionManagement.css";
import { SkillDetailDialog } from "./SkillDetailDialog";

interface Props {
  loadSkills: (forceReload?: boolean) => Promise<SkillMetadata[]>;
  revision: number;
  codexHome: string;
  setEnabled: (path: string, enabled: boolean) => Promise<boolean>;
  onClose: () => void;
  onChanged?: () => void;
  readSkillContent?: (path: string) => Promise<string>;
  onOpenSkillPath?: (path: string) => Promise<void>;
}

export function SkillManagementPage({ loadSkills, revision, codexHome, setEnabled, onClose, onChanged, readSkillContent, onOpenSkillPath }: Props) {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<SkillMetadata | null>(null);
  const [content, setContent] = useState("");
  const [contentError, setContentError] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  useEffect(() => {
    let active = true;
    void loadSkills(true).then((items) => { if (active) { setSkills(items); setLoadError(""); } }).catch((value) => { if (active) setLoadError(errorMessage(value)); });
    return () => { active = false; };
  }, [loadSkills, revision, refresh]);
  useEffect(() => {
    if (!selected?.path || !readSkillContent) return;
    let active = true;
    setContent(""); setContentError(""); setContentLoading(true);
    void readSkillContent(selected.path).then((text) => { if (active) setContent(text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")); })
      .catch((value) => { if (active) setContentError(errorMessage(value)); })
      .finally(() => { if (active) setContentLoading(false); });
    return () => { active = false; };
  }, [readSkillContent, selected]);
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
      onChanged?.(); setRefresh((value) => value + 1);
    }
    catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  async function installBuiltin(command: "install_builtin_skill" | "install_builtin_cs_docs" | "install_builtin_amap") {
    setBusy(true); setError("");
    try {
      const path = await invoke<string>(command);
      try {
        if (await setEnabled(path, false)) setError("技能已安装，但有效状态仍为启用，请检查上层配置。");
      } catch (value) {
        setError(`技能已安装，但默认关闭失败，请检查开关状态：${errorMessage(value)}`);
      }
      onChanged?.(); setRefresh((value) => value + 1);
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  async function uninstall(skill: SkillMetadata) {
    if (skill.scope !== "user" || skill.pluginId) return;
    setBusy(true); setError("");
    try {
      await invoke<string>("uninstall_local_skill", { path: skill.path });
      onChanged?.(); setRefresh((value) => value + 1);
    }
    catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  const root = `${codexHome.split("\\").join("/").replace(/\/$/, "").toLowerCase()}/skills/`;
  const builtinImage = (skill: SkillMetadata) => Boolean(codexHome) && !skill.pluginId && skill.scope === "user" && skill.path.split("\\").join("/").toLowerCase() === root + "image-gen/skill.md";
  const builtinDocs = (skill: SkillMetadata) => Boolean(codexHome) && !skill.pluginId && skill.scope === "user" && skill.path.split("\\").join("/").toLowerCase() === root + "cs-docs/skill.md";
  const builtinAmap = (skill: SkillMetadata) => Boolean(codexHome) && !skill.pluginId && skill.scope === "user" && skill.path.split("\\").join("/").toLowerCase() === root + "amap/skill.md";
  const officialDocs = (skill: SkillMetadata) => skill.name === "openai-docs";
  const groupOf = (skill: SkillMetadata) => builtinDocs(skill) ? "系统" : builtinImage(skill) || builtinAmap(skill) ? "CS 内置" : skill.scope === "user" ? "个人" : "系统";
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = normalized ? skills.filter((skill) => `${builtinImage(skill) ? "兔子生图" : ""} ${builtinAmap(skill) ? "高德地图 amap 地点 路线 天气" : ""} ${builtinDocs(skill) ? "CS 文档 Codex Shell 文档" : ""} ${officialDocs(skill) ? "OpenAI 官方文档" : ""} ${skill.name} ${skill.interface?.displayName || ""} ${skill.interface?.shortDescription || ""} ${skill.description}`.toLocaleLowerCase().includes(normalized)) : skills;
  const showBuiltinImage = !skills.some(builtinImage) && (!query.trim() || "兔子生图 image-gen 通过兔子渠道生成商品图、海报和场景图片。".toLowerCase().includes(query.trim().toLowerCase()));
  const showBuiltinDocs = !skills.some(builtinDocs) && (!query.trim() || "CS 文档 cs-docs Codex Shell 文档 实现 开发".toLowerCase().includes(query.trim().toLowerCase()));
  const showBuiltinAmap = !skills.some(builtinAmap) && (!normalized || "高德地图 amap 查询地点 规划路线 测量距离 天气".toLowerCase().includes(normalized));
  const selectedState = skills.find((skill) => skill.path === selected?.path) || selected;
  return <div className="skill-management-page extension-catalog">
    <header className="skill-management-header"><div><h1>技能</h1></div><div><button type="button" disabled={busy} onClick={() => void install()}>从目录安装</button><button type="button" disabled={busy} onClick={() => setRefresh((value) => value + 1)}>刷新</button><button type="button" onClick={onClose}>返回会话</button></div></header>
    <div className="skill-management-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索技能" /></div>
    {error && <p className="error" role="alert">{error}</p>}
    {loadError && <p className="error" role="alert">{loadError}</p>}
    {["CS 内置", "个人", "系统"].map((group) => {
      const items = filtered.filter((skill) => !skill.pluginId && groupOf(skill) === group).sort((a, b) => Number(builtinImage(b)) - Number(builtinImage(a)) || Number(builtinDocs(b)) - Number(builtinDocs(a)));
      if (!items.length && !(group === "CS 内置" && (showBuiltinImage || showBuiltinAmap)) && !(group === "系统" && showBuiltinDocs)) return null;
      return <section className="skill-management-section" aria-label={group} key={group}><h2>{group}</h2>
        {group === "CS 内置" && showBuiltinImage && <article className="skill-management-card"><span className="skill-management-icon"><Sparkles aria-hidden="true" /></span><div><strong>兔子生图</strong><p>通过兔子渠道生成商品图、海报和场景图片。</p></div><span className="skill-management-actions"><button type="button" className="skill-management-toggle" disabled={busy} onClick={() => void installBuiltin("install_builtin_skill")}>安装</button></span></article>}
        {group === "CS 内置" && showBuiltinAmap && <article className="skill-management-card"><span className="skill-management-icon"><MapPin aria-hidden="true" /></span><div><strong>高德地图</strong><p>查询地点、规划路线、测量距离和获取天气。</p></div><span className="skill-management-actions"><button type="button" className="skill-management-toggle" disabled={busy} onClick={() => void installBuiltin("install_builtin_amap")}>安装</button></span></article>}
        {group === "系统" && showBuiltinDocs && <article className="skill-management-card"><span className="skill-management-icon"><BookOpen aria-hidden="true" /></span><div><strong>CS 文档</strong><p>说明 Codex Shell 当前实现、配置、开发流程和能力边界。</p></div><span className="skill-management-actions"><button type="button" className="skill-management-toggle" disabled={busy} onClick={() => void installBuiltin("install_builtin_cs_docs")}>安装</button></span></article>}
        {items.map((skill) => {
          const relative = skill.path.split("\\").join("/").toLowerCase();
          const owned = codexHome && relative.startsWith(root) && /^[^/.][^/]*\/skill\.md$/.test(relative.slice(root.length));
          const scopeLabel = skill.scope === "repo" ? "项目" : skill.scope === "admin" ? "管理员" : null;
          return <article className={`skill-management-card ${!skill.enabled ? "disabled" : ""}`} key={skill.path}>
            <button type="button" className="skill-management-main" disabled={!readSkillContent} onClick={() => setSelected(skill)}><span className="skill-management-icon">{builtinDocs(skill) || officialDocs(skill) ? <BookOpen aria-hidden="true" /> : builtinAmap(skill) ? <MapPin aria-hidden="true" /> : <Sparkles aria-hidden="true" />}</span><span><strong>{builtinImage(skill) ? "兔子生图" : builtinDocs(skill) ? "CS 文档" : builtinAmap(skill) ? "高德地图" : officialDocs(skill) ? "OpenAI 官方文档" : skill.interface?.displayName || skill.name}{scopeLabel && <em className="skill-scope-badge">{scopeLabel}</em>}</strong><p>{builtinImage(skill) ? "通过兔子渠道生成商品图、海报和场景图片。" : builtinDocs(skill) ? "说明 Codex Shell 当前实现、配置、开发流程和能力边界。" : builtinAmap(skill) ? "查询地点、规划路线、测量距离和获取天气。" : officialDocs(skill) ? "查询官方 OpenAI、Codex 和 API 文档，不代表 CS 当前实现。" : skill.interface?.shortDescription || skill.shortDescription || skill.description}</p></span></button>
            <span className="skill-management-actions">{owned && skill.scope === "user" && !skill.pluginId && <button type="button" className="skill-management-remove" title="移到 CS 的 uninstalled-skills 目录，可恢复" disabled={busy} onClick={() => void uninstall(skill)}>卸载</button>}<button type="button" className="skill-enable-switch" role="switch" aria-label={`${skill.name} 启用状态`} title={skill.enabled ? "关闭技能" : "启用技能"} aria-checked={skill.enabled} disabled={busy} onClick={() => void toggle(skill)}><span /></button></span>
          </article>;
        })}
      </section>;
    })}
    {selectedState && <SkillDetailDialog title={builtinDocs(selectedState) ? "CS 文档" : builtinAmap(selectedState) ? "高德地图" : selectedState.interface?.displayName || selectedState.name} description={builtinDocs(selectedState) ? "说明 Codex Shell 当前实现、配置、开发流程和能力边界。" : builtinAmap(selectedState) ? "查询地点、规划路线、测量距离和获取天气。" : selectedState.interface?.shortDescription || selectedState.shortDescription || selectedState.description} path={selectedState.path} icon={builtinDocs(selectedState) || officialDocs(selectedState) ? <BookOpen /> : builtinAmap(selectedState) ? <MapPin /> : <Sparkles />} toolbarAction={<button type="button" className="skill-enable-switch" role="switch" aria-label={`${selectedState.name} 启用状态`} title={selectedState.enabled ? "关闭技能" : "启用技能"} aria-checked={selectedState.enabled} disabled={busy} onClick={() => void toggle(selectedState)}><span /></button>} content={content} loading={contentLoading} contentError={contentError} onOpenPath={onOpenSkillPath} onClose={() => setSelected(null)} />}
  </div>;
}
