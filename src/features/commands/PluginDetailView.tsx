import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileText, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { PluginDetail } from "../../generated/app-server/v2/PluginDetail";
import type { SkillSummary } from "../../generated/app-server/v2/SkillSummary";
import type { useExtensions } from "../extensions/useExtensions";
import { errorMessage } from "../../shared/errors";

interface Props {
  detail: PluginDetail;
  extensions: ReturnType<typeof useExtensions>;
  onClose: () => void;
  onChanged: () => void;
}

export function PluginDetailView({ detail, extensions, onClose, onChanged }: Props) {
  const { readSkillContent } = extensions;
  const [skills, setSkills] = useState(detail.skills);
  const [selected, setSelected] = useState<SkillSummary | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [contentError, setContentError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
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
  const control = (skill: SkillSummary) => <input type="checkbox" role="switch" aria-label={title(skill) + " 启用状态"} checked={skill.enabled} disabled={busy || !detail.summary.installed || !skill.path} onChange={() => void toggle(skill)} />;
  return <section className="plugin-detail-view">
    <header className="skill-management-header"><button type="button" title="返回插件" aria-label="关闭详情" onClick={onClose}><ArrowLeft /></button><h1>{detail.summary.interface?.displayName || detail.summary.name}</h1></header>
    <p>{detail.description || detail.summary.interface?.shortDescription}</p>
    {error && <p role="alert" className="error">{error}</p>}
    <h2>技能 {skills.length}</h2>
    {skills.map((skill) => <div className="extension-row" key={skill.path || skill.name}>
      <button className="plugin-skill-link" type="button" disabled={!skill.path} onClick={() => setSelected(skill)}>
        <FileText /><span><strong>{title(skill)}</strong><small>{skill.interface?.shortDescription || skill.shortDescription || skill.description}</small></span>
      </button>{control(skill)}
    </div>)}
    <h2>信息</h2>
    <dl className="plugin-information"><dt>开发者</dt><dd>{detail.summary.interface?.developerName || "未提供"}</dd><dt>版本</dt><dd>{detail.summary.localVersion || detail.summary.version || "未提供"}</dd><dt>状态</dt><dd>{detail.summary.installed ? "已安装" : "未安装"}</dd></dl>
    {detail.mcpServers.length > 0 && <p>MCP：{detail.mcpServers.join("、")}</p>}
    {detail.hooks.length > 0 && <p>Hooks：{detail.hooks.length} 个</p>}
    {detail.apps.length > 0 && <p>Connector：{detail.apps.map((app) => app.name).join("、")}</p>}
    {selected && <dialog ref={dialog} aria-labelledby="plugin-skill-title" className="plugin-skill-dialog" onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close(); } }}>
      <header><h2 id="plugin-skill-title">{title(selected)}</h2><div>{selectedState && control(selectedState)}<button type="button" autoFocus title="关闭技能详情" aria-label="关闭技能详情" onClick={() => dialog.current?.close()}><X /></button></div></header>
      <p>{selected.interface?.shortDescription || selected.description}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="plugin-skill-content">{loading ? <p role="status">正在读取技能…</p> : contentError ? <p role="alert" className="error">{contentError}</p> : <ReactMarkdown skipHtml components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{content}</ReactMarkdown>}</div>
    </dialog>}
  </section>;
}
