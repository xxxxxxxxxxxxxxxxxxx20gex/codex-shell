import { RuntimeLogPanel } from "../runtime/RuntimeLogPanel";
import { RuntimeNoticeList } from "../runtime/RuntimeNoticeList";
import type { RuntimeLogStore } from "../runtime/runtimeLogStore";
import type { RuntimeNoticeStore } from "../runtime/runtimeNoticeStore";

interface Props {
  noticeStore: RuntimeNoticeStore;
  logStore: RuntimeLogStore;
}

export function DiagnosticsPreferences({ noticeStore, logStore }: Props) {
  return (
    <div className="preferences-section preferences-diagnostics">
      <h3>诊断</h3>
      <p>查看本次运行期间收到的 app-server 提示和有界 stderr 日志。</p>
      <RuntimeNoticeList store={noticeStore} />
      <RuntimeLogPanel store={logStore} />
    </div>
  );
}
