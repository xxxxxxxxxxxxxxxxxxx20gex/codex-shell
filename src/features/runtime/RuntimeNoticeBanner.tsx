import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import type { RuntimeNoticeStore } from "./runtimeNoticeStore";
import "./RuntimeNotices.css";

interface Props {
  store: RuntimeNoticeStore;
  onShowStatus: () => void;
}

export function RuntimeNoticeBanner({ store, onShowStatus }: Props) {
  const notices = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const notice = notices[notices.length - 1];
  if (!notice) return null;
  return (
    <div className="runtime-notice-banner" data-kind={notice.kind}>
      <button type="button" onClick={onShowStatus}>
        <strong>{notice.title}</strong>
        <span>{notice.message}</span>
        {notices.length > 1 && <i>另有 {notices.length - 1} 项</i>}
      </button>
      <button type="button" className="runtime-notice-dismiss" onClick={() => store.dismiss(notice.id)} aria-label="忽略这条提示"><X aria-hidden="true" /></button>
    </div>
  );
}
