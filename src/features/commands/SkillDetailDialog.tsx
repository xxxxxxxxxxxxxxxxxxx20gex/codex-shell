import { useEffect, useRef, useState, type ReactNode } from "react";
import { FolderOpen, MoreHorizontal, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  title: string;
  description: string;
  path?: string | null;
  icon: ReactNode;
  toolbarAction?: ReactNode;
  content: string;
  loading: boolean;
  contentError: string;
  error?: string;
  onOpenPath?: (path: string) => Promise<void>;
  onClose: () => void;
}

export function SkillDetailDialog({ title, description, path, icon, toolbarAction, content, loading, contentError, error, onOpenPath, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLSpanElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setMenuOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setMenuOpen(false); } };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape, true); };
  }, [menuOpen]);

  return <dialog ref={dialog} className="plugin-skill-dialog skill-detail-dialog" aria-labelledby="skill-detail-title" onClose={onClose} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
  }}>
    <header className="skill-detail-toolbar"><span className="skill-detail-icon">{icon}</span><div className="skill-detail-actions">{onOpenPath && path && <span ref={menu} className="skill-detail-menu-anchor"><button className="skill-detail-icon-button" type="button" aria-label="更多操作" title="更多操作" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreHorizontal /></button>{menuOpen && <span className="skill-detail-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void onOpenPath(path); }}><FolderOpen aria-hidden="true" />在资源管理器中显示</button></span>}</span>}<button className="plugin-dialog-close skill-detail-icon-button" type="button" autoFocus aria-label="关闭技能详情" title="关闭技能详情" onClick={() => dialog.current?.close()}><X /></button>{toolbarAction}</div></header>
    <div className="skill-detail-heading"><h2 id="skill-detail-title">{title} <span>Skill</span></h2><p>{description}</p></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="plugin-skill-content">{loading ? <p role="status">正在读取技能…</p> : contentError ? <p role="alert" className="error">{contentError}</p> : <ReactMarkdown skipHtml components={{ a: ({ children }) => <span>{children}</span>, img: () => null }}>{content}</ReactMarkdown>}</div>
  </dialog>;
}
