import { useMemo, useState } from "react";
import "./App.css";
import { ModelSettingsPanel } from "./features/models/ModelSettingsPanel";
import { getModelTemplate } from "./features/models/modelTemplates";
import type { ModelSettings } from "./features/models/types";

const initialSettings: ModelSettings = {
  baseUrl: "https://api.openai.com/v1",
  modelId: "gpt-5.6-sol",
  capabilityTemplate: "gpt-5.6-sol",
  reasoningEffort: "low",
  verbosity: "low",
};

const timeline = [
  { kind: "plan", title: "分析项目结构", detail: "已读取工作区与项目约束", state: "done" },
  { kind: "message", title: "正在构建桌面壳", detail: "Tauri runtime 与 React 工作台已建立连接边界", state: "active" },
  { kind: "command", title: "pnpm build", detail: "等待本轮代码完成后执行", state: "queued" },
];

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [draft, setDraft] = useState("");
  const [running, setRunning] = useState(false);
  const template = useMemo(
    () => getModelTemplate(settings.capabilityTemplate),
    [settings.capabilityTemplate],
  );

  return (
    <main className="app-shell">
      <header className="titlebar">
        <div className="brand-mark">C</div>
        <div className="brand-copy">
          <strong>Codex Shell</strong>
          <span>个人智能体工作台</span>
        </div>
        <div className="runtime-pill"><i /> app-server 未连接</div>
        <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="打开设置">⚙</button>
      </header>

      <section className="workspace-grid">
        <aside className="sidebar panel">
          <button className="primary-button new-task">＋ 新建任务</button>
          <div className="section-label">工作区</div>
          <button className="workspace-item active">
            <span className="folder-icon">⌁</span>
            <span><strong>codex-shell</strong><small>C:\Users\…\Desktop</small></span>
          </button>
          <div className="section-heading"><span>最近线程</span><button>＋</button></div>
          <nav className="thread-list">
            <button className="active"><span>构建 Codex 智能体壳</span><small>刚刚</small></button>
            <button><span>分析 app-server 协议</span><small>昨天</small></button>
            <button><span>模型中转配置研究</span><small>2 天前</small></button>
          </nav>
          <div className="sidebar-footer">
            <div className="avatar">W</div><span><strong>本地工作区</strong><small>Windows · 个人模式</small></span>
          </div>
        </aside>

        <section className="conversation panel">
          <div className="conversation-header">
            <div><h1>构建 Codex 智能体壳</h1><p>codex-shell · main</p></div>
            <div className="header-actions"><button>↗ 导出</button><button>•••</button></div>
          </div>
          <div className="timeline">
            <div className="user-message">围绕 Codex 核心构建一个个人智能体壳子，模型与地址由用户配置。</div>
            <div className="agent-block">
              <div className="agent-avatar">C</div>
              <div className="agent-content">
                <div className="agent-meta"><strong>Codex</strong><span>{settings.modelId}</span></div>
                <p>项目边界已经确定。我会把原版 <code>codex app-server</code> 作为独立运行时，通过双向 JSON-RPC 驱动界面，并把密钥留在 Windows 凭据管理器中。</p>
                <div className="task-stack">
                  {timeline.map((item) => (
                    <div className={`task-row ${item.state}`} key={item.title}>
                      <span className="task-state">{item.state === "done" ? "✓" : item.state === "active" ? "◌" : "·"}</span>
                      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                      <em>{item.kind}</em>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="composer-wrap">
            <div className="composer">
              <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="交给 Codex 一个任务…" />
              <div className="composer-toolbar">
                <div><button className="tool-button">＋</button><button className="model-button" onClick={() => setSettingsOpen(true)}>{settings.modelId}⌄</button></div>
                <button className={running ? "stop-button" : "send-button"} onClick={() => setRunning(!running)}>{running ? "■" : "↑"}</button>
              </div>
            </div>
            <p>Codex 可能会修改文件并执行命令，请在批准前检查操作。</p>
          </div>
        </section>

        <aside className="inspector panel">
          <div className="inspector-tabs"><button className="active">变更 <b>3</b></button><button>任务</button><button>日志</button></div>
          <div className="diff-summary"><span>本轮修改</span><strong><i>+428</i><em>−36</em></strong></div>
          <div className="file-change"><div><span className="file-badge ts">TS</span><strong>src/App.tsx</strong><small>M</small></div><span><i>+182</i> <em>−24</em></span></div>
          <div className="file-change"><div><span className="file-badge rs">RS</span><strong>src-tauri/src/lib.rs</strong><small>M</small></div><span><i>+96</i> <em>−12</em></span></div>
          <div className="file-change"><div><span className="file-badge md">MD</span><strong>docs/status/</strong><small>A</small></div><span><i>+150</i></span></div>
          <div className="inspector-card">
            <div className="card-title"><span>当前模型</span><button onClick={() => setSettingsOpen(true)}>配置</button></div>
            <strong>{settings.modelId}</strong>
            <p>{template?.description}</p>
            <div className="capability-chips">
              {settings.reasoningEffort && <span>推理 · {settings.reasoningEffort}</span>}
              {settings.verbosity && <span>回答 · {settings.verbosity}</span>}
              {template?.inputModalities.includes("image") && <span>视觉</span>}
            </div>
          </div>
          <div className="inspector-card approval-card">
            <div className="card-title"><span>审批策略</span><i>交互式</i></div>
            <p>文件修改与 Shell 命令将在执行前展示。</p>
          </div>
        </aside>
      </section>

      {settingsOpen && (
        <ModelSettingsPanel
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => { setSettings(next); setSettingsOpen(false); }}
        />
      )}
    </main>
  );
}

export default App;
