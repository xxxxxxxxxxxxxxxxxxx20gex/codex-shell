import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { CompactIconButton } from "../../shared/CompactIconButton";
import type { RuntimeNoticeDestination, RuntimeNoticeStore } from "./runtimeNoticeStore";
import "./RuntimeNotices.css";

interface Props {
  store: RuntimeNoticeStore;
  threadId?: string;
  onShowStatus: (destination: RuntimeNoticeDestination) => void;
}

export function RuntimeNoticeBanner({ store, threadId, onShowStatus }: Props) {
  const allNotices = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const notices = allNotices.filter((notice) => !notice.threadId || notice.threadId === threadId);
  const notice = notices[notices.length - 1];
  if (!notice) return null;
  return (
    <div className="runtime-notice-banner" data-kind={notice.kind}>
      <button type="button" onClick={() => onShowStatus(notice.destination)} aria-label={`${notice.title}：打开${notice.destination === "runtime" ? "运行环境" : "诊断"}`}>
        <strong>{notice.title}</strong>
        <span>{notice.message}</span>
        {notices.length > 1 && <i>另有 {notices.length - 1} 项</i>}
      </button>
      <CompactIconButton label="忽略这条提示" icon={<X aria-hidden="true" />} onClick={() => store.dismiss(notice.id)} />
    </div>
  );
}
