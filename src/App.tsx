import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FuzzyFileSearchResult } from "./generated/app-server/FuzzyFileSearchResult";
import type { ModeKind } from "./generated/app-server/ModeKind";
import { errorMessage } from "./shared/errors";
import "./App.css";
import { PermissionModeSelector } from "./features/approvals/PermissionModeSelector";
import type { PermissionMode } from "./features/approvals/permissionModes";
import { GoalPanel } from "./features/commands/GoalPanel";
import { McpStatusPanel } from "./features/commands/McpStatusPanel";
import { ReviewPanel } from "./features/commands/ReviewPanel";
import { SkillPicker } from "./features/commands/SkillPicker";
import { commandDisabled, SlashCommandMenu } from "./features/commands/SlashCommandMenu";
import { useResizablePanels } from "./features/layout/useResizablePanels";
import {
  activeSlashCommandQuery,
  matchingSlashCommands,
  parseSlashCommand,
  type SlashCommandId,
} from "./features/commands/slashCommands";
import { DiffInspector } from "./features/diff/DiffInspector";
import { ModelSettingsPanel } from "./features/models/ModelSettingsPanel";
import type { ModelSettings } from "./features/models/types";
import { RuntimeLogPanel } from "./features/runtime/RuntimeLogPanel";
import { RuntimeNoticeBanner } from "./features/runtime/RuntimeNoticeBanner";
import { StatusInspector } from "./features/runtime/StatusInspector";
import {
  sendOrSteer,
  type FileMention,
  type SkillMention,
  useAgentSession,
} from "./features/runtime/useAgentSession";
import { ServerInteractionDialog } from "./features/interactions/ServerInteractionDialog";
import { ConversationTimeline } from "./features/threads/ConversationTimeline";
import { ContextHeatBar } from "./features/threads/ContextHeatBar";
import { ThreadHistoryList } from "./features/threads/ThreadHistoryList";
import { buildThreadNumbers, formatThreadNumber, threadTitle } from "./features/threads/threadPresentation";
import { FileMentionMenu } from "./features/workspaces/FileMentionMenu";
import { WorkspaceExplorer } from "./features/workspaces/WorkspaceExplorer";
import { WorkspaceSelector } from "./features/workspaces/WorkspaceSelector";
import {
  activeFileMentionQuery,
  type DefaultWorkspace,
  isManagedWorkspacePath,
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
  const [defaultWorkspace, setDefaultWorkspace] = useState<DefaultWorkspace | null>(null);
  const [workspaceExplorerOpen, setWorkspaceExplorerOpen] = useState(false);
  const [mentions, setMentions] = useState<FileMention[]>([]);
  const [skills, setSkills] = useState<SkillMention[]>([]);
  const [mentionResults, setMentionResults] = useState<FuzzyFileSearchResult[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [uiError, setUiError] = useState("");
  const [commandNotice, setCommandNotice] = useState("");
  const [commandPanel, setCommandPanel] = useState<"skills" | "mcp" | "goal" | "review" | null>(null);
  const [collaborationMode, setCollaborationMode] = useState<ModeKind>("default");
  const [slashMenuForced, setSlashMenuForced] = useState(false);
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<"changes" | "status" | "logs">("changes");
  const mentionRequestRef = useRef(0);
  const {
    workspaceGridRef,
    workspaceGridStyle,
    sidebarOpen,
    setSidebarOpen,
    inspectorOpen,
    setInspectorOpen,
    sidebarWidth,
    inspectorWidth,
    resizingPanel,
    beginPanelResize,
    resizePanel,
    finishPanelResize,
  } = useResizablePanels();
  const newThreadWorkspacePath = workspacePath ?? defaultWorkspace?.path ?? null;
  const session = useAgentSession(settings, permissionMode, newThreadWorkspacePath);
  const currentWorkspacePath = session.thread?.cwd
    ? String(session.thread.cwd)
    : newThreadWorkspacePath;
  const usingManagedWorkspace = Boolean(
    currentWorkspacePath
    && defaultWorkspace
    && isManagedWorkspacePath(currentWorkspacePath, defaultWorkspace.rootPath),
  );
  const workspaceStatusKind = currentWorkspacePath
    ? (usingManagedWorkspace ? "default" : "custom")
    : "waiting";
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
  const threadNumbers = useMemo(() => buildThreadNumbers(session.history), [session.history]);
  const activeThreadNumber = session.thread ? threadNumbers.get(session.thread.id) : undefined;

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    void invoke<ModelSettings>("load_model_settings").then(setSettings).catch(() => undefined);
    void invoke<DefaultWorkspace>("get_default_workspace")
      .then(setDefaultWorkspace)
      .catch((error) => setUiError(errorMessage(error)));
  }, []);

  useEffect(() => {
    if (!session.thread?.cwd) return;
    const cwd = String(session.thread.cwd);
    if (defaultWorkspace && isManagedWorkspacePath(cwd, defaultWorkspace.rootPath)) {
      setWorkspacePath(null);
      saveWorkspacePath(null);
      return;
    }
    setWorkspacePath(cwd);
    saveWorkspacePath(cwd);
  }, [defaultWorkspace, session.thread?.id, session.thread?.cwd]);

  useEffect(() => {
    const requestId = ++mentionRequestRef.current;
    if (!currentWorkspacePath || mentionQuery === null) {
      setMentionResults([]);
      setMentionLoading(false);
      return;
    }
    setMentionLoading(true);
    const timeout = window.setTimeout(() => {
      void session.searchFiles(mentionQuery).then((results) => {
        if (mentionRequestRef.current === requestId) setMentionResults(results);
      }).catch((error) => {
        if (mentionRequestRef.current === requestId) setUiError(errorMessage(error));
      }).finally(() => {
        if (mentionRequestRef.current === requestId) setMentionLoading(false);
      });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [currentWorkspacePath, mentionQuery, session.searchFiles]);

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
      if (id === "review") {
        if (session.running) throw new Error("当前任务完成后才能启动代码审查");
        if (!args) { setCommandPanel("review"); return; }
        if (await session.startReview({ type: "custom", instructions: args }, "inline")) {
          setCommandNotice("原生代码审查已在当前 Session 启动。");
        }
        return;
      }
      if (id === "plan") {
        if (session.running) throw new Error("当前任务完成后才能切换到计划模式");
        setCollaborationMode("plan");
        if (!args) {
          setCommandNotice("计划模式已开启。下一条消息会让 Codex 先分析需求并制定计划；点击工具栏中的计划模式可退出。");
          return;
        }
        if (await session.send(args, mentions, skills, "plan")) {
          setMentions([]);
          setSkills([]);
          setMentionResults([]);
          setCommandNotice("计划请求已发送，Codex 将先输出计划而不是直接实施。");
        }
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
      setUiError(errorMessage(error));
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
    if (await sendOrSteer(session, message, mentions, skills, collaborationMode)) {
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
    setCollaborationMode("default");
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
          setUiError(command.requiresThread && !session.thread ? "请先发送一条消息创建 Session" : "当前任务运行期间不能执行该命令");
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

  return (
    <main className="app-shell">
      <section
        ref={workspaceGridRef}
        className={`workspace-grid ${sidebarOpen ? "" : "sidebar-hidden"} ${inspectorOpen ? "" : "inspector-hidden"} ${resizingPanel ? "resizing" : ""}`}
        style={workspaceGridStyle}
      >
        <aside className="sidebar panel">
          <button className="primary-button new-task" onClick={startNewTask} disabled={session.submitting || session.openingThreadId !== null}>＋ 新建对话</button>
          <div className="section-label">工作区</div>
          <WorkspaceSelector path={usingManagedWorkspace ? null : workspacePath} disabled={session.submitting || session.openingThreadId !== null} onExplore={() => setWorkspaceExplorerOpen(true)} onChange={changeWorkspace} onError={setUiError} />
          <ThreadHistoryList
            threads={session.history}
            archived={session.historyArchived}
            activeThreadId={session.thread?.id ?? null}
            loading={session.historyLoading}
            error={session.historyError}
            disabled={session.submitting || session.openingThreadId !== null}
            actionThreadId={session.threadActionId}
            runningThreadIds={session.runningThreadIds}
            hasMore={session.historyHasMore}
            onOpen={(threadId) => { setCollaborationMode("default"); void session.openThread(threadId); }}
            onRename={(threadId, name) => void session.renameThread(threadId, name)}
            onTogglePin={(thread) => void session.toggleThreadPin(thread)}
            onArchive={(threadId) => void session.archiveThread(threadId)}
            onUnarchive={(threadId) => void session.unarchiveThread(threadId)}
            onFork={(threadId) => void session.forkThread(threadId)}
            onDelete={(threadId) => void session.deleteThread(threadId)}
            onShowArchived={session.showArchivedHistory}
            onRefresh={() => void session.refreshHistory()}
            onLoadMore={() => void session.loadMoreHistory()}
          />
          <div className="sidebar-footer"><div className="avatar">本</div><span><strong>本地模式</strong><small>Windows · 个人使用</small></span></div>
        </aside>

        <div
          className={`panel-resizer sidebar-resizer ${sidebarOpen ? "" : "collapsed"}`}
          role="separator"
          aria-label="调整左侧功能区宽度"
          aria-orientation="vertical"
          aria-valuenow={sidebarWidth}
          onPointerDown={(event) => sidebarOpen && beginPanelResize(event, "sidebar")}
          onPointerMove={(event) => resizePanel(event, "sidebar")}
          onPointerUp={finishPanelResize}
          onPointerCancel={finishPanelResize}
        >
          <button
            type="button"
            className="panel-toggle"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "隐藏左侧功能区" : "显示左侧功能区"}
            title={sidebarOpen ? "隐藏左侧功能区" : "显示左侧功能区"}
          >
            <svg aria-hidden="true" viewBox="0 0 10 10">
              <path d={sidebarOpen ? "M6.5 2 3.5 5l3 3" : "M3.5 2l3 3-3 3"} />
            </svg>
          </button>
        </div>

        <section className="conversation panel">
          {session.thread && (
            <div className="conversation-session-heading" title={session.thread.id}>
              <span>{activeThreadNumber ? formatThreadNumber(activeThreadNumber) : "#--"}</span>
              <strong>{threadTitle(session.thread)}</strong>
            </div>
          )}
          {session.turns.length > 0 ? (
            <ConversationTimeline
              turns={session.turns}
              running={session.running}
              modelId={settings.modelId}
              plansByTurnId={session.plansByTurnId}
              activeItemTurnIds={session.activeItemTurnIds}
              mcpProgressByItemId={session.mcpProgressByItemId}
            />
          ) : (
            <div className="timeline"><div className="conversation-empty"><div className="agent-avatar">C</div><h2>开始一个新对话</h2><p>今日默认工作区会自动准备，也可以选择已有项目目录，然后描述需要 Codex 完成的工作。</p></div></div>
          )}
          <div className="composer-wrap">
            <RuntimeNoticeBanner
              store={session.runtimeNoticeStore}
              onShowStatus={() => {
                setInspectorOpen(true);
                setInspectorTab("status");
              }}
            />
            {(session.error || uiError) && <div className="composer-error">{session.error || uiError}</div>}
            {commandNotice && <div className="composer-notice">{commandNotice}</div>}
            <div className="composer has-context-heatbar">
              <ContextHeatBar usage={session.tokenUsage} hasThread={Boolean(session.thread)} running={session.running} onCompact={() => runSlashCommand("compact", "", false)} />
              {(mentions.length > 0 || skills.length > 0) && <div className="mention-chips">
                {skills.map((skill) => <span className="skill-chip" key={skill.path} title={skill.path}>✦ {skill.name}<button onClick={() => toggleSkill(skill)}>×</button></span>)}
                {mentions.map((mention) => <span key={mention.path} title={mention.path}>@{mention.name}<button onClick={() => setMentions((current) => current.filter((item) => item.path !== mention.path))}>×</button></span>)}
              </div>}
              <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setUiError(""); setCommandNotice(""); setSlashMenuForced(false); setSlashMenuDismissed(false); }} onKeyDown={handleComposerKeyDown} placeholder={collaborationMode === "plan" ? "描述需要分析和规划的任务…" : currentWorkspacePath ? "交给 Codex 一个任务，输入 / 使用命令，输入 @ 引用文件…" : "正在准备默认工作区…"} />
              {currentWorkspacePath && mentionQuery !== null && <FileMentionMenu query={mentionQuery} results={mentionResults} loading={mentionLoading} onSelect={selectMention} />}
              {slashMenuVisible && <SlashCommandMenu query={slashQuery ?? ""} selectedIndex={slashSelectedIndex} hasThread={Boolean(session.thread)} running={session.running} onSelect={(id) => void runSlashCommand(id, "", !slashMenuForced)} />}
              {commandPanel === "skills" && <SkillPicker selected={skills} loadSkills={session.listSkills} onToggle={toggleSkill} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "mcp" && <McpStatusPanel loadServers={session.listMcpServers} loginServer={session.loginMcpServer} reloadServers={session.reloadMcpServers} readResource={session.readMcpResource} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "goal" && <GoalPanel getGoal={session.getThreadGoal} setGoal={session.setThreadGoal} clearGoal={session.clearThreadGoal} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "review" && <ReviewPanel startReview={session.startReview} onStarted={(delivery) => { setCommandPanel(null); setCommandNotice(delivery === "detached" ? "已打开独立 Review Session。" : "原生代码审查已在当前 Session 启动。"); }} onClose={() => setCommandPanel(null)} />}
              <div className="composer-toolbar">
                <div className="composer-tools">
                  <button className={`command-button ${slashMenuVisible || commandPanel ? "active" : ""}`} onClick={() => { setCommandPanel(null); setSlashMenuDismissed(false); setSlashMenuForced((current) => !current); setSlashSelectedIndex(0); }} title="Skills、MCP、计划、压缩与目标">/</button>
                  {collaborationMode === "plan" && <button className="plan-mode-button" onClick={() => { setCollaborationMode("default"); setCommandNotice("已退出计划模式，下一条消息将按默认模式执行。"); }} title="退出计划模式"><span>☷</span>计划模式<i>×</i></button>}
                  <button className="model-button" disabled={session.submitting || session.runningThreadCount > 0} onClick={() => setSettingsOpen(true)} title={session.submitting || session.runningThreadCount > 0 ? "任务运行期间不能重启模型连接" : "配置模型"}>{settings.modelId}⌄</button>
                  <PermissionModeSelector value={permissionMode} disabled={session.running} onChange={changePermissionMode} />
                </div>
                <div className="composer-actions">
                  <button className="send-button" disabled={!draft.trim()} onClick={() => void submit()} aria-label={session.running ? "补充指令" : "发送任务"}>↑</button>
                  {session.running && <button className="stop-button" onClick={() => void session.interrupt()} aria-label="停止任务">■</button>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          className={`panel-resizer inspector-resizer ${inspectorOpen ? "" : "collapsed"}`}
          role="separator"
          aria-label="调整右侧功能区宽度"
          aria-orientation="vertical"
          aria-valuenow={inspectorWidth}
          onPointerDown={(event) => inspectorOpen && beginPanelResize(event, "inspector")}
          onPointerMove={(event) => resizePanel(event, "inspector")}
          onPointerUp={finishPanelResize}
          onPointerCancel={finishPanelResize}
        >
          <button
            type="button"
            className="panel-toggle"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setInspectorOpen((open) => !open)}
            aria-label={inspectorOpen ? "隐藏右侧功能区" : "显示右侧功能区"}
            title={inspectorOpen ? "隐藏右侧功能区" : "显示右侧功能区"}
          >
            <svg aria-hidden="true" viewBox="0 0 10 10">
              <path d={inspectorOpen ? "M3.5 2l3 3-3 3" : "M6.5 2 3.5 5l3 3"} />
            </svg>
          </button>
        </div>

        <aside className="inspector panel">
          <div className="inspector-heading inspector-tabs">
            <button className={inspectorTab === "changes" ? "active" : ""} onClick={() => setInspectorTab("changes")}>变更</button>
            <button className={inspectorTab === "status" ? "active" : ""} onClick={() => setInspectorTab("status")}>状态</button>
            <button className={inspectorTab === "logs" ? "active" : ""} onClick={() => setInspectorTab("logs")}>日志</button>
          </div>
          {inspectorTab === "changes" ? <DiffInspector diff={currentDiff} /> : inspectorTab === "logs" ? (
            <RuntimeLogPanel store={session.runtimeLogStore} />
          ) : (
            <StatusInspector turnCount={session.turns.length} threadId={session.thread?.id ?? null} workspacePath={currentWorkspacePath} workspaceKind={workspaceStatusKind} usingManagedWorkspace={usingManagedWorkspace} canUseDefaultWorkspace={Boolean(defaultWorkspace)} codexHome={session.codexHome} codexHomeDisabled={session.runningThreadCount > 0 || session.submitting} noticeStore={session.runtimeNoticeStore} windowsSandboxReadiness={session.windowsSandboxReadiness} onBrowseWorkspace={() => setWorkspaceExplorerOpen(true)} onUseDefaultWorkspace={() => changeWorkspace(null)} onSetupWindowsSandbox={() => session.setupWindowsSandbox("unelevated")} onRestart={session.restart} />
          )}
        </aside>
      </section>

      {settingsOpen && <ModelSettingsPanel settings={settings} loadModels={session.listModels} loadProviderCapabilities={session.readModelProviderCapabilities} onClose={() => setSettingsOpen(false)} onSave={(next) => { setSettings(next); setSettingsOpen(false); void session.restart(); }} />}
      <ServerInteractionDialog store={session.interactionStore} />
      {workspaceExplorerOpen && currentWorkspacePath && <WorkspaceExplorer rootPath={currentWorkspacePath} onClose={() => setWorkspaceExplorerOpen(false)} readDirectory={session.readWorkspaceDirectory} readFile={session.readWorkspaceFile} />}
    </main>
  );
}

export default App;
