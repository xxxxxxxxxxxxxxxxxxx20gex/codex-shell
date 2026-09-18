import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, FileStack, FileText, FolderOpen, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { PluginDetail } from "../../generated/app-server/v2/PluginDetail";
import type { SkillSummary } from "../../generated/app-server/v2/SkillSummary";
import type { SkillMetadata } from "../../generated/app-server/v2/SkillMetadata";
import type { useExtensions } from "../extensions/useExtensions";
import { errorMessage } from "../../shared/errors";

interface Props {
  detail: PluginDetail;
  extensions: ReturnType<typeof useExtensions>;
  onClose: () => void;
  onChanged: () => void;
  onInstall?: () => void;
  installing?: boolean;
  installError?: string;
  loadSkills?: () => Promise<SkillMetadata[]>;
  revision?: number;
  onOpenSkillPath?: (path: string) => Promise<void>;
}

function skillPath(path: string | null | undefined) {
  return path?.replace(/\\/g, "/").toLowerCase();
}

export function PluginDetailView({ detail, extensions, onClose, onChanged, onInstall, installing, installError, loadSkills, revision = 0, onOpenSkillPath }: Props) {
  const { readSkillContent } = extensions;
  const [skills, setSkills] = useState(detail.skills);
  const [selected, setSelected] = useState<SkillSummary | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [contentError, setContentError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setSkills(detail.skills); }, [detail]);
  useEffect(() => {
    if (!detail.summary.installed || !loadSkills) return;
    let active = true;
    void loadSkills().then((available) => {
      if (!active) return;
      const enabledByPath = new Map(available.map((skill) => [skillPath(skill.path), skill.enabled]));
      setSkills((items) => items.map((skill) => {
        const enabled = enabledByPath.get(skillPath(skill.path));
        return enabled === undefined ? skill : { ...skill, enabled };
      }));
    }).catch((value) => { if (active) setError(errorMessage(value)); });
    return () => { active = false; };
  }, [detail.summary.installed, loadSkills, revision]);
  useEffect(() => {
    if (!selected?.path) return;
    let active = true;
    setContent(""); setContentError(""); setLoading(true);
    dialog.current?.showModal();
    void readSkillContent(selected.path).then((text) => {
      if (active) setContent(text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ""));
    }).catch((value) => { if (active) setContentError(errorMessage(value)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, readSkillContent]);

  async function toggle(skill: SkillSummary) {
    if (!skill.path) return;
    setBusy(true); setError("");
    try {
      const enabled = await extensions.setSkillEnabled(skill.path, !skill.enabled);
      setSkills((items) => items.map((item) => item.path === skill.path ? { ...item, enabled } : item));
      if (enabled === skill.enabled) setError("有效状态受上层配置限制。");
      onChanged();
    } catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  }
  const title = (skill: SkillSummary) => skill.interface?.displayName || skill.name;
  const selectedState = skills.find((skill) => skill.path === selected?.path);
  const control = (skill: SkillSummary) => <button type="button" className="skill-enable-switch" role="switch" aria-label={title(skill) + " 启用状态"} title={!detail.summary.installed ? "安装插件后可启用" : skill.enabled ? "关闭技能" : "启用技能"} aria-checked={detail.summary.installed && skill.enabled} disabled={busy || !detail.summary.installed || !skill.path} onClick={() => void toggle(skill)}><span /></button>;
  return <section className="plugin-detail-view">
    <nav><button className="plugin-back" type="button" title="返回插件" aria-label="关闭详情" disabled={installing} onClick={onClose}><ArrowLeft />插件</button></nav>
    <header className="plugin-detail-heading"><span className="plugin-detail-icon"><FileStack /></span><div><h1>{detail.summary.interface?.displayName || detail.summary.name}</h1><p>{detail.summary.interface?.shortDescription || detail.description}</p></div>{!detail.summary.installed && onInstall ? <button className="plugin-install" type="button" disabled={installing} onClick={onInstall}>{installing ? "正在安装…" : "安装插件"}</button> : <span className="plugin-status">{detail.summary.installed ? "已安装" : "未安装"}</span>}</header>
    <p>{detail.summary.interface?.longDescription || detail.description}</p>
    {installError && <p role="alert" className="error">{installError}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <h2 className="plugin-section-title">技能 <span>{skills.length}</span></h2>
    {!detail.summary.installed && <p className="plugin-install-hint">可查看技能内容，安装插件后可独立启停。</p>}
    {skills.map((skill) => <div className="plugin-skill-row" key={skill.path || skill.name}>
      <button className="plugin-skill-link" type="button" disabled={!skill.path} onClick={() => setSelected(skill)}>
        <FileText /><span><strong>{title(skill)}</strong><small title={skill.interface?.shortDescription || skill.shortDescription || skill.description}>{skill.interface?.shortDescription || skill.shortDescription || skill.description}</small></span><ChevronRight className="plugin-skill-chevron" />
      </button>{control(skill)}
    </div>)}
    <h2 className="plugin-section-title">信息</h2>
    <dl className="plugin-information"><dt>开发者</dt><dd>{detail.summary.interface?.developerName || "未提供"}</dd><dt>版本</dt><dd>{detail.summary.localVersion || detail.summary.version || "未提供"}</dd><dt>状态</dt><dd>{detail.summary.installed ? "已安装" : "未安装"}</dd></dl>
    {detail.mcpServers.length > 0 && <p>MCP：{detail.mcpServers.join("、")}</p>}
    {detail.hooks.length > 0 && <p>Hooks：{detail.hooks.length} 个</p>}
    {detail.apps.length > 0 && <p>Connector：{detail.apps.map((app) => app.name).join("、")}</p>}
    {selected && <dialog ref={dialog} aria-labelledby="plugin-skill-title" className="plugin-skill-dialog" onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close(); } }}>
      <header><div>{onOpenSkillPath && selected.path && <button className="plugin-open-path" type="button" onClick={() => void onOpenSkillPath(selected.path!)}><FolderOpen aria-hidden="true" />在资源管理器中打开</button>}</div><div><button className="plugin-dialog-close" type="button" autoFocus title="关闭技能详情" aria-label="关闭技能详情" onClick={() => dialog.current?.close()}><X /></button>{selectedState && control(selectedState)}</div></header>
      <h2 id="plugin-skill-title">{title(selected)} <span className="plugin-status">Skill</span></h2>
      <p>{selected.interface?.shortDescription || selected.description}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="plugin-skill-content">{loading ? <p role="status">正在读取技能…</p> : contentError ? <p role="alert" className="error">{contentError}</p> : <ReactMarkdown skipHtml components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{content}</ReactMarkdown>}</div>
    </dialog>}
  </section>;
}
