import { useSyncExternalStore } from "react";
import type { RuntimeLogStore } from "./runtimeLogStore";
import "./RuntimeLogPanel.css";

interface Props {
  store: RuntimeLogStore;
}

const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatLogTime(timestamp: number) {
  const milliseconds = new Date(timestamp).getMilliseconds().toString().padStart(3, "0");
  return `${timeFormatter.format(timestamp)}.${milliseconds}`;
}

function logLevel(line: string) {
  if (/\bERROR\b/i.test(line)) return "error";
  if (/\bWARN(?:ING)?\b/i.test(line)) return "warning";
  if (/\bDEBUG\b/i.test(line)) return "debug";
  if (/\bTRACE\b/i.test(line)) return "trace";
  return "info";
}

export function RuntimeLogPanel({ store }: Props) {
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return (
    <section className="preferences-runtime-card runtime-log-panel" aria-label="app-server 实时日志">
      <header>
        <div><strong>app-server stderr</strong><small>最近 {entries.length}/200 条</small></div>
        <button className="secondary-button" type="button" disabled={entries.length === 0} onClick={store.clear}>清空</button>
      </header>
      <p>仅保留本次运行期间收到的有界实时日志；日志可能包含对话和工具参数，请按敏感本地数据处理。</p>
      {entries.length === 0 ? (
        <div className="runtime-log-empty">尚未收到 stderr 日志。完整结构化记录仍保存在 CODEX_HOME 的 logs_2.sqlite。</div>
      ) : (
        <div className="runtime-log-entries">
          {entries.map((entry) => (
            <article data-level={logLevel(entry.line)} key={entry.id}>
              <time dateTime={new Date(entry.receivedAt).toISOString()}>{formatLogTime(entry.receivedAt)}</time>
              <pre>{entry.line}</pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
