import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import type { RuntimeNoticeStore } from "./runtimeNoticeStore";

interface Props {
  store: RuntimeNoticeStore;
}

export function RuntimeNoticeList({ store }: Props) {
  const notices = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return (
    <section className="preferences-runtime-card runtime-notice-list">
      <header>
        <span>运行提示</span>
        <button type="button" disabled={notices.length === 0} onClick={store.clear}>清空</button>
      </header>
      {notices.length === 0 ? <p>当前没有 app-server 警告。</p> : notices.slice().reverse().map((notice) => (
        <article key={notice.id} data-kind={notice.kind}>
          <div><strong>{notice.title}</strong><button type="button" onClick={() => store.dismiss(notice.id)} aria-label="忽略"><X aria-hidden="true" /></button></div>
          <p>{notice.message}</p>
          {notice.path && <code>{notice.path}</code>}
        </article>
      ))}
    </section>
  );
}
