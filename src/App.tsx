import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FuzzyFileSearchResult } from "./generated/app-server/FuzzyFileSearchResult";
import "./App.css";
import { ApprovalDialog } from "./features/approvals/ApprovalDialog";
import { PermissionModeSelector } from "./features/approvals/PermissionModeSelector";
import { getPermissionMode, type PermissionMode } from "./features/approvals/permissionModes";
import { GoalPanel } from "./features/commands/GoalPanel";
import { McpStatusPanel } from "./features/commands/McpStatusPanel";
import { SkillPicker } from "./features/commands/SkillPicker";
import { commandDisabled, SlashCommandMenu } from "./features/commands/SlashCommandMenu";
import {
  activeSlashCommandQuery,
  matchingSlashCommands,
  parseSlashCommand,
  type SlashCommandId,
} from "./features/commands/slashCommands";
import { DiffInspector } from "./features/diff/DiffInspector";
import { ModelSettingsPanel } from "./features/models/ModelSettingsPanel";
import type { ModelSettings } from "./features/models/types";
import { type FileMention, type SkillMention, useAgentSession } from "./features/runtime/useAgentSession";
import { ConversationTimeline } from "./features/threads/ConversationTimeline";
import { ContextHeatBar } from "./features/threads/ContextHeatBar";
import { ThreadHistoryList } from "./features/threads/ThreadHistoryList";
import { FileMentionMenu } from "./features/workspaces/FileMentionMenu";
import { WorkspaceExplorer } from "./features/workspaces/WorkspaceExplorer";
import { WorkspaceSelector } from "./features/workspaces/WorkspaceSelector";
import {
  activeFileMentionQuery,
  loadWorkspacePath,
  replaceActiveFileMention,
  resolveFileSearchPath,
  saveWorkspacePath,
} from "./features/workspaces/workspaceState";

const initialSettings: ModelSettings = {
  baseUrl: "https://api.openai.com/v1",
  modelId: "gpt-5.6-sol",
  capabilityTemplate: "gpt-5.6-sol",
  reasoningEffort: "low",
  verbosity: "low",
};

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [draft, setDraft] = useState("");
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("ask");
  const [workspacePath, setWorkspacePath] = useState<string | null>(loadWorkspacePath);
  const [workspaceExplorerOpen, setWorkspaceExplorerOpen] = useState(false);
  const [mentions, setMentions] = useState<FileMention[]>([]);
  const [skills, setSkills] = useState<SkillMention[]>([]);
  const [mentionResults, setMentionResults] = useState<FuzzyFileSearchResult[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [uiError, setUiError] = useState("");
  const [commandNotice, setCommandNotice] = useState("");
  const [commandPanel, setCommandPanel] = useState<"skills" | "mcp" | "goal" | null>(null);
  const [slashMenuForced, setSlashMenuForced] = useState(false);
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<"changes" | "status">("changes");
  const mentionRequestRef = useRef(0);
  const session = useAgentSession(settings, permissionMode, workspacePath);
  const permissionConfig = getPermissionMode(permissionMode);
  const mentionQuery = activeFileMentionQuery(draft);
  const typedSlashQuery = activeSlashCommandQuery(draft);
  const slashQuery = slashMenuForced ? "" : slashMenuDismissed ? null : typedSlashQuery;
  const slashCommands = slashQuery === null ? [] : matchingSlashCommands(slashQuery);
  const slashMenuVisible = commandPanel === null && slashQuery !== null;
  const currentDiff = useMemo(() => {
    for (let index = session.turns.length - 1; index >= 0; index -= 1) {
      const diff = session.diffsByTurnId[session.turns[index].id];
      if (diff) return diff;
    }
    return "";
  }, [session.diffsByTurnId, session.turns]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    void invoke<ModelSettings>("load_model_settings").then(setSettings).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session.thread?.cwd) return;
    const cwd = String(session.thread.cwd);
    setWorkspacePath(cwd);
    saveWorkspacePath(cwd);
  }, [session.thread?.id, session.thread?.cwd]);

  useEffect(() => {
    const requestId = ++mentionRequestRef.current;
    if (!workspacePath || mentionQuery === null) {
      setMentionResults([]);
      setMentionLoading(false);
      return;
    }
    setMentionLoading(true);
    const timeout = window.setTimeout(() => {
      void session.searchFiles(mentionQuery).then((results) => {
        if (mentionRequestRef.current === requestId) setMentionResults(results);
      }).catch((error) => {
        if (mentionRequestRef.current === requestId) setUiError(error instanceof Error ? error.message : String(error));
      }).finally(() => {
        if (mentionRequestRef.current === requestId) setMentionLoading(false);
      });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [mentionQuery, session.searchFiles, workspacePath]);

  useEffect(() => setSlashSelectedIndex(0), [slashQuery]);

  useEffect(() => {
    if (!slashMenuVisible && commandPanel === null) return;
    function dismissOnOutsidePointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".slash-command-menu, .agent-command-panel, .command-button")) return;
      setSlashMenuForced(false);
      setSlashMenuDismissed(true);
      setCommandPanel(null);
    }
    document.addEventListener("pointerdown", dismissOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", dismissOnOutsidePointer, true);
  }, [commandPanel, slashMenuVisible]);

  async function runSlashCommand(id: SlashCommandId, args = "", clearDraft = true) {
    setSlashMenuForced(false);
    setSlashMenuDismissed(true);
    if (clearDraft) setDraft("");
    setUiError("");
    setCommandNotice("");
    try {
      if (id === "skills") { setCommandPanel("skills"); return; }
      if (id === "mcp") { setCommandPanel("mcp"); return; }
      if (id === "plan") {
        setUiError("真正的 Plan 模式依赖实验性 collaborationMode；Codex Shell 当前只使用稳定 app-server v2，因此暂不启用。");
        return;
      }
      if (id === "compact") {
        if (args) throw new Error("用法：/compact");
        if (session.running) throw new Error("当前任务完成后才能压缩这个 Session");
        await session.compactThread();
        setCommandNotice("已开始压缩当前 Session，上下文摘要会通过时间线返回。");
        return;
      }
      if (!args) { setCommandPanel("goal"); return; }
      if (args.toLocaleLowerCase() === "clear") {
        await session.clearThreadGoal();
        setCommandNotice("当前 Session 的长期目标已清除。");
      } else {
        await session.setThreadGoal(args);
        setCommandNotice("长期目标已保存，后续 Turn 会持续跟进。");
      }
    } catch (error) {
      setUiError(error instanceof Error ? error.message : String(error));
    }
  }

  async function submit() {
    const message = draft.trim();
    if (!message) return;
    const command = parseSlashCommand(message);
    if (command) {
      await runSlashCommand(command.id, command.args);
      return;
    }
    if (await session.send(message, mentions, skills)) {
      setDraft("");
      setMentions([]);
      setSkills([]);
      setMentionResults([]);
      setCommandNotice("");
    }
  }

  function startNewTask() {
    setDraft("");
    setMentions([]);
    setSkills([]);
    setCommandPanel(null);
    setSlashMenuForced(false);
    setSlashMenuDismissed(false);
    setCommandNotice("");
    session.startNewTask();
  }

  function changePermissionMode(next: PermissionMode) {
    if (next === permissionMode) return;
    startNewTask();
    setPermissionMode(next);
  }

  function changeWorkspace(path: string | null) {
    setWorkspaceExplorerOpen(false);
    startNewTask();
    setWorkspacePath(path);
    saveWorkspacePath(path);
  }

  function selectMention(result: FuzzyFileSearchResult) {
    if (result.match_type === "directory") {
      const directoryQuery = result.path.replace(/\\/g, "/").replace(/\/$/, "");
      setDraft((current) => current.replace(/(^|\s)@[^\s@]*$/, `$1@${directoryQuery}/`));
      return;
    }
    const mention = { name: result.file_name, path: resolveFileSearchPath(result) };
    setMentions((current) => current.some((item) => item.path === mention.path) ? current : [...current, mention]);
    setDraft((current) => replaceActiveFileMention(current, result.file_name));
    setMentionResults([]);
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (slashMenuVisible && slashCommands.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSlashSelectedIndex((current) => (current + direction + slashCommands.length) % slashCommands.length);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashMenuForced(false);
        setSlashMenuDismissed(true);
        if (typedSlashQuery !== null) setDraft("");
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const command = slashCommands[slashSelectedIndex] ?? slashCommands[0];
        if (command && commandDisabled(command, Boolean(session.thread), session.running)) {
          if (command.experimental) void runSlashCommand(command.id, "", !slashMenuForced);
          else setUiError(command.requiresThread && !session.thread ? "请先发送一条消息创建 Session" : "当前任务运行期间不能执行该命令");
        } else if (command) {
          void runSlashCommand(command.id, "", !slashMenuForced);
        }
        return;
      }
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submit();
  }

  function toggleSkill(skill: SkillMention) {
    setSkills((current) => current.some((item) => item.path === skill.path)
      ? current.filter((item) => item.path !== skill.path)
      : [...current, skill]);
  }

  const runtimeLabel = session.connectionStatus === "connected"
    ? (session.runningThreadCount > 0
        ? `app-server 运行中 · ${session.runningThreadCount}`
        : session.submitting ? "app-server 正在启动任务" : "app-server 已连接")
    : session.connectionStatus === "connecting"
      ? "app-server 连接中"
      : session.connectionStatus === "error"
        ? "app-server 连接失败"
        : "app-server 未连接";
  const sessionTitle = session.thread?.name?.trim() || session.thread?.preview.trim() || "新任务";

  return (
    <main className="app-shell">
      <header className="titlebar" data-tauri-drag-region>
        <div className="brand-mark" data-tauri-drag-region>C</div>
        <div className="brand-copy" data-tauri-drag-region><strong>Codex Shell</strong><span>个人智能体工作台</span></div>
        <div className={`runtime-pill ${session.connectionStatus}`} data-tauri-drag-region><i /> {runtimeLabel}</div>
      </header>

      <section className="workspace-grid">
        <aside className="sidebar panel">
          <button className="primary-button new-task" onClick={startNewTask} disabled={session.submitting || session.openingThreadId !== null}>＋ 新建任务</button>
          <div className="section-label">工作区</div>
          <WorkspaceSelector path={workspacePath} disabled={session.submitting || session.openingThreadId !== null} onExplore={() => setWorkspaceExplorerOpen(true)} onChange={changeWorkspace} onError={setUiError} />
          <ThreadHistoryList
            threads={session.history}
            activeThreadId={session.thread?.id ?? null}
            loading={session.historyLoading}
            error={session.historyError}
            disabled={session.submitting || session.openingThreadId !== null}
            actionThreadId={session.threadActionId}
            runningThreadIds={session.runningThreadIds}
            hasMore={session.historyHasMore}
            onOpen={(threadId) => void session.openThread(threadId)}
            onRename={(threadId, name) => void session.renameThread(threadId, name)}
            onTogglePin={(thread) => void session.toggleThreadPin(thread)}
            onArchive={(threadId) => void session.archiveThread(threadId)}
            onDelete={(threadId) => void session.deleteThread(threadId)}
            onRefresh={() => void session.refreshHistory()}
            onLoadMore={() => void session.loadMoreHistory()}
          />
          <div className="sidebar-footer"><div className="avatar">本</div><span><strong>本地模式</strong><small>Windows · 个人使用</small></span></div>
        </aside>

        <section className="conversation panel">
          <div className="conversation-header">
            <div><h1>{sessionTitle}</h1><p>{session.thread ? `${session.turns.length} 个本地回合 · ${session.thread.cwd}` : "准备开始新的本地会话"}</p></div>
          </div>
          {session.turns.length > 0 ? (
            <ConversationTimeline turns={session.turns} running={session.running} modelId={settings.modelId} plansByTurnId={session.plansByTurnId} />
          ) : (
            <div className="timeline"><div className="conversation-empty"><div className="agent-avatar">C</div><h2>开始一个新任务</h2><p>选择工作区，配置模型与 API Key，然后描述需要 Codex 完成的工作。</p></div></div>
          )}
          <div className="composer-wrap">
            {(session.error || uiError) && <div className="composer-error">{session.error || uiError}</div>}
            {commandNotice && <div className="composer-notice">{commandNotice}</div>}
            <div className="composer has-context-heatbar">
              <ContextHeatBar usage={session.tokenUsage} hasThread={Boolean(session.thread)} running={session.running} onCompact={() => runSlashCommand("compact", "", false)} />
              {(mentions.length > 0 || skills.length > 0) && <div className="mention-chips">
                {skills.map((skill) => <span className="skill-chip" key={skill.path} title={skill.path}>✦ {skill.name}<button onClick={() => toggleSkill(skill)}>×</button></span>)}
                {mentions.map((mention) => <span key={mention.path} title={mention.path}>@{mention.name}<button onClick={() => setMentions((current) => current.filter((item) => item.path !== mention.path))}>×</button></span>)}
              </div>}
              <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setUiError(""); setCommandNotice(""); setSlashMenuForced(false); setSlashMenuDismissed(false); }} onKeyDown={handleComposerKeyDown} placeholder={workspacePath ? "交给 Codex 一个任务，输入 / 使用命令，输入 @ 引用文件…" : "输入 / 使用命令，或直接交给 Codex 一个任务…"} />
              {workspacePath && mentionQuery !== null && <FileMentionMenu query={mentionQuery} results={mentionResults} loading={mentionLoading} onSelect={selectMention} />}
              {slashMenuVisible && <SlashCommandMenu query={slashQuery ?? ""} selectedIndex={slashSelectedIndex} hasThread={Boolean(session.thread)} running={session.running} onSelect={(id) => void runSlashCommand(id, "", !slashMenuForced)} />}
              {commandPanel === "skills" && <SkillPicker selected={skills} loadSkills={session.listSkills} onToggle={toggleSkill} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "mcp" && <McpStatusPanel loadServers={session.listMcpServers} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "goal" && <GoalPanel getGoal={session.getThreadGoal} setGoal={session.setThreadGoal} clearGoal={session.clearThreadGoal} onClose={() => setCommandPanel(null)} />}
              <div className="composer-toolbar">
                <div className="composer-tools">
                  <button className={`command-button ${slashMenuVisible || commandPanel ? "active" : ""}`} onClick={() => { setCommandPanel(null); setSlashMenuDismissed(false); setSlashMenuForced((current) => !current); setSlashSelectedIndex(0); }} title="Skills、MCP、压缩与目标">/</button>
                  <button className="model-button" disabled={session.submitting || session.runningThreadCount > 0} onClick={() => setSettingsOpen(true)} title={session.submitting || session.runningThreadCount > 0 ? "任务运行期间不能重启模型连接" : "配置模型"}>{settings.modelId}⌄</button>
                  <PermissionModeSelector value={permissionMode} disabled={session.running} onChange={changePermissionMode} />
                </div>
                <button className={session.running ? "stop-button" : "send-button"} disabled={!session.running && !draft.trim()} onClick={() => session.running ? void session.interrupt() : void submit()} aria-label={session.running ? "停止任务" : "发送任务"}>{session.running ? "■" : "↑"}</button>
              </div>
            </div>
            <p>Codex 可能会修改文件并执行命令，请在批准前检查操作。</p>
          </div>
        </section>

        <aside className="inspector panel">
          <div className="inspector-heading inspector-tabs">
            <button className={inspectorTab === "changes" ? "active" : ""} onClick={() => setInspectorTab("changes")}>变更</button>
            <button className={inspectorTab === "status" ? "active" : ""} onClick={() => setInspectorTab("status")}>状态</button>
          </div>
          {inspectorTab === "changes" ? <DiffInspector diff={currentDiff} /> : <>
            <div className="inspector-card"><div className="card-title"><span>Codex Runtime</span><i>{session.connectionStatus}</i></div><strong>{runtimeLabel}</strong><p>{session.error || "发送任务时自动启动，空闲时保持当前连接状态。"}</p></div>
            <div className="inspector-card approval-card"><div className="card-title"><span>审批策略</span><i>{permissionConfig.label}</i></div><p>{permissionConfig.description}</p></div>
            <div className="inspector-card"><div className="card-title"><span>本地会话</span><i>{session.turns.length} 回合</i></div><strong>{session.thread?.id || "尚未创建"}</strong><p>{session.thread ? `工作区：${session.thread.cwd}` : "创建任务后会自动持久化，重新启动软件仍可恢复。"}</p></div>
            <div className="inspector-card"><div className="card-title"><span>独立 CODEX_HOME</span><i>{session.codexHome ? "isolated" : "waiting"}</i></div><strong>{session.codexHome || "等待 app-server 初始化"}</strong><p>Codex Shell 的线程、状态库和缓存不会写入官方 Codex 的用户目录。</p></div>
          </>}
        </aside>
      </section>

      {settingsOpen && <ModelSettingsPanel settings={settings} onClose={() => setSettingsOpen(false)} onSave={(next) => { setSettings(next); setSettingsOpen(false); void session.restart(); }} />}
      {session.approval && <ApprovalDialog approval={session.approval} onApprove={session.approve} onDecline={session.decline} />}
      {workspaceExplorerOpen && workspacePath && <WorkspaceExplorer rootPath={workspacePath} onClose={() => setWorkspaceExplorerOpen(false)} readDirectory={session.readWorkspaceDirectory} readFile={session.readWorkspaceFile} />}
    </main>
  );
}

export default App;
