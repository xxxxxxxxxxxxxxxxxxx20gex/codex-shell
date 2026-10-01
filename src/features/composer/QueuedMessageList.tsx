import { useCallback, useState } from "react";
import { CornerDownRight, FilePenLine, ListEnd, MoreHorizontal, Paperclip, Trash2 } from "lucide-react";
import { CompactIconButton } from "../../shared/CompactIconButton";
import { ContextMenu } from "../../shared/ContextMenu";
import { ImageThumbnail } from "../attachments/AttachmentGallery";
import type { QueuedTurnInput } from "../runtime/useQueuedTurns";
import "./QueuedMessageList.css";

interface Props {
  items: QueuedTurnInput[];
  running: boolean;
  canSteer: boolean;
  readFile: (path: string) => Promise<string>;
  onEdit: (item: QueuedTurnInput) => void;
  onSteer: (item: QueuedTurnInput) => Promise<void>;
  onRemove: (id: string) => void;
  onResume: () => void;
  onError: (error: unknown) => void;
}

export function QueuedMessageList({ items, running, canSteer, readFile, onEdit, onSteer, onRemove, onResume, onError }: Props) {
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLButtonElement; x: number; y: number } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const menuItem = menu && items.find((item) => item.id === menu.id);

  async function steer(item: QueuedTurnInput) {
    if (!canSteer || pendingId !== null) return;
    setPendingId(item.id);
    try { await onSteer(item); } catch (error) { onError(error); }
    finally { setPendingId(null); }
  }

  if (items.length === 0) return null;
  return (
    <section className="queued-message-panel" aria-label="待发送消息">
      {!running && <div className="queued-message-heading"><span>待发送 · {items.length}</span><button type="button" onClick={onResume}>继续发送</button></div>}
      <ul className="queued-message-list" aria-label={`${items.length} 条待发送消息`} onScroll={closeMenu}>
        {items.map((item) => {
          const label = item.text || [...item.mentions, ...(item.images ?? [])].map((attachment) => attachment.name).join("、") || "附件";
          const preview = item.images?.[0];
          const busy = pendingId !== null;
          return <li className="queued-message-row" key={item.id}>
            <ListEnd className="queued-message-icon" aria-hidden="true" />
            {preview ? <span className="queued-message-thumbnail"><ImageThumbnail image={preview} readFile={readFile} /></span>
              : item.mentions.length > 0 && <Paperclip className="queued-message-icon" aria-label="包含文件附件" />}
            <span className="queued-message-text" title={label}>{label}</span>
            <div className="queued-message-actions">
              {running && <button type="button" className="queued-message-steer" disabled={!canSteer || busy} onClick={() => void steer(item)} aria-label={`引导发送待发送消息：${label}`} title={canSteer ? "立即引导当前任务" : "当前阶段暂不可引导"}><CornerDownRight aria-hidden="true" /><span>{pendingId === item.id ? "发送中" : "引导"}</span></button>}
              <CompactIconButton className="queued-message-delete" label={`取消待发送消息：${label}`} title="取消待发送" icon={<Trash2 aria-hidden="true" />} disabled={busy} onClick={() => onRemove(item.id)} />
              <CompactIconButton label={`消息操作：${label}`} title="更多操作" icon={<MoreHorizontal aria-hidden="true" />} disabled={busy} aria-haspopup="menu" aria-expanded={menu?.id === item.id} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => {
                const anchor = event.currentTarget;
                const bounds = anchor.getBoundingClientRect();
                setMenu((current) => current?.id === item.id ? null : { id: item.id, anchor, x: bounds.right - 200, y: bounds.bottom + 4 });
              }} />
            </div>
          </li>;
        })}
      </ul>
      {menu && menuItem && <ContextMenu x={menu.x} y={menu.y} anchor={menu.anchor} label="待发送消息操作" onClose={closeMenu} onError={onError} actions={[
        { label: "编辑消息", icon: <FilePenLine aria-hidden="true" />, run: () => onEdit(menuItem) },
        { label: "取消待发送", icon: <Trash2 aria-hidden="true" />, run: () => onRemove(menuItem.id) },
      ]} />}
    </section>
  );
}
