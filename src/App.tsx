import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FuzzyFileSearchResult } from "./generated/app-server/FuzzyFileSearchResult";
import type { ModeKind } from "./generated/app-server/ModeKind";
import { errorMessage } from "./shared/errors";
import "./App.css";
import { PermissionModeSelector } from "./features/approvals/PermissionModeSelector";
import { DEFAULT_PERMISSION_MODE, type PermissionMode } from "./features/approvals/permissionModes";
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
import { ModelQuickPicker } from "./features/models/ModelQuickPicker";
import type { ModelSettings } from "./features/models/types";
import { RuntimeLogPanel } from "./features/runtime/RuntimeLogPanel";
import { RuntimeNoticeBanner } from "./features/runtime/RuntimeNoticeBanner";
import { StatusInspector } from "./features/runtime/StatusInspector";
import {
  sendOrQueue,
  type FileMention,
  type SkillMention,
  useAgentSession,
} from "./features/runtime/useAgentSession";
import { ServerInteractionDialog } from "./features/interactions/ServerInteractionDialog";
import { ConversationTimeline } from "./features/threads/ConversationTimeline";
import { ContextHeatBar } from "./features/threads/ContextHeatBar";
import { ThreadHistoryList } from "./features/threads/ThreadHistoryList";
import { threadTitle } from "./features/threads/threadPresentation";
import { FileMentionMenu } from "./features/workspaces/FileMentionMenu";
import { WorkspaceExplorer } from "./features/workspaces/WorkspaceExplorer";
import { WorkspaceSelector } from "./features/workspaces/WorkspaceSelector";
import { useDismissiblePopover } from "./shared/useDismissiblePopover";
import "./styles/tokens.css";
import {
  activeFileMentionQuery,
  type DefaultProjectDirectory,
  isDefaultProjectPath,
  loadWorkspacePath,
  replaceActiveFileMention,
  resolveFileSearchPath,
  resolveProjectRelativePath,
  saveWorkspacePath,
} from "./features/workspaces/workspaceState";

const initialSettings: ModelSettings = {
  baseUrl: "https://api.openai.com/v1",
  modelId: "gpt-5.6-sol",
  reasoningEffort: "low",
  verbosity: "low",
};

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [modelDisplayName, setModelDisplayName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(DEFAULT_PERMISSION_MODE);
  const [projectPath, setProjectPath] = useState<string | null>(loadWorkspacePath);
  const [defaultProjectDirectory, setDefaultProjectDirectory] = useState<DefaultProjectDirectory | null>(null);
  const [workspaceExplorerOpen, setWorkspaceExplorerOpen] = useState(false);
  const [workspaceExplorerInitialPath, setWorkspaceExplorerInitialPath] = useState<string | null>(null);
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
  const commandButtonRef = useRef<HTMLButtonElement>(null);
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
  const newThreadCwd = projectPath ?? defaultProjectDirectory?.path ?? null;
  const session = useAgentSession(settings, permissionMode, newThreadCwd);
  const currentProjectPath = session.thread?.cwd
    ? String(session.thread.cwd)
    : newThreadCwd;
  const usingDefaultProjectDirectory = Boolean(
    currentProjectPath
    && defaultProjectDirectory
    && isDefaultProjectPath(currentProjectPath, defaultProjectDirectory.rootPath),
  );
  const projectSource = currentProjectPath
    ? (usingDefaultProjectDirectory ? "default" : session.thread ? "thread" : "selected")
    : "waiting";
  const mentionQuery = activeFileMentionQuery(draft);
  const typedSlashQuery = activeSlashCommandQuery(draft);
  const slashQuery = slashMenuForced ? "" : slashMenuDismissed ? null : typedSlashQuery;

  function changeModelSettings(next: ModelSettings) {
    setSettings(next);
    if ("__TAURI_INTERNALS__" in window) {
      void invoke("save_model_settings", { settings: next }).catch((error) => setUiError(errorMessage(error)));
    }
  }
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
    void invoke<DefaultProjectDirectory>("get_default_project_directory")
      .then(setDefaultProjectDirectory)
      .catch((error) => setUiError(errorMessage(error)));
  }, []);

  useEffect(() => {
    const requestId = ++mentionRequestRef.current;
    if (!currentProjectPath || mentionQuery === null) {
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
  }, [currentProjectPath, mentionQuery, session.searchFiles]);

  useEffect(() => setSlashSelectedIndex(0), [slashQuery]);

  useDismissiblePopover<HTMLDivElement>({
    open: slashMenuVisible || commandPanel !== null,
    onClose: () => {
      setSlashMenuForced(false);
      setSlashMenuDismissed(true);
      setCommandPanel(null);
    },
    isInside: (target) => target instanceof Element && Boolean(target.closest(".slash-command-menu, .agent-command-panel, .command-button")),
  });

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
    if (await sendOrQueue(session, message, mentions, skills, collaborationMode)) {
      setDraft("");
      setMentions([]);
      setSkills([]);
      setMentionResults([]);
      setCommandNotice("");
    } else if (session.running) {
      setUiError("当前消息未能加入发送队列");
    }
  }

  async function steerCurrentTurn() {
    const message = draft.trim();
    if (!message || !session.canSteer) return;
    if (await session.steer(message, mentions, skills)) {
      setDraft("");
      setMentions([]);
      setSkills([]);
      setMentionResults([]);
      setCommandNotice("");
    }
  }

  async function steerQueuedTurn(queued: (typeof session.queuedTurns)[number]) {
    if (!session.canSteer) return;
    if (await session.steer(queued.text, queued.mentions, queued.skills)) {
      session.removeQueued(queued.id);
    }
  }

  async function submitWithMode(mode: "queue" | "steer") {
    if (mode === "steer") {
      if (parseSlashCommand(draft.trim())) {
        setUiError("Steer 只支持普通消息，不能直接引导斜杠命令");
        return;
      }
      await steerCurrentTurn();
      return;
    }
    await submit();
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
    setPermissionMode(next);
    setCommandNotice("权限设置将在当前 Session 的下一条消息生效。");
  }

  function changeProject(path: string | null) {
    setWorkspaceExplorerOpen(false);
    setWorkspaceExplorerInitialPath(null);
    startNewTask();
    setProjectPath(path);
    saveWorkspacePath(path);
  }

  function openWorkspaceExplorer(initialFilePath: string | null = null) {
    setWorkspaceExplorerInitialPath(initialFilePath);
    setWorkspaceExplorerOpen(true);
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
    if (event.key !== "Enter" || (event.shiftKey && !event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && session.canSteer) void steerCurrentTurn();
    else void submit();
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
          <div className="section-label">项目</div>
          <WorkspaceSelector path={usingDefaultProjectDirectory ? null : currentProjectPath} disabled={session.submitting || session.openingThreadId !== null} onExplore={() => openWorkspaceExplorer()} onChange={changeProject} onError={setUiError} />
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
              <strong>{threadTitle(session.thread)}</strong>
            </div>
          )}
          {session.turns.length > 0 ? (
            <ConversationTimeline
              key={session.thread?.id ?? "new"}
              turns={session.turns}
              running={session.running}
              threadId={session.thread?.id}
              onFork={(threadId) => void session.forkThread(threadId)}
              plansByTurnId={session.plansByTurnId}
              activeItemTurnIds={session.activeItemTurnIds}
              mcpProgressByItemId={session.mcpProgressByItemId}
            />
          ) : (
            <div className="timeline"><div className="conversation-empty"><div className="agent-avatar">CS</div><h2>Codex Shell</h2><p>原生 Codex app-server 工作台</p></div></div>
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
              {session.queuedTurns.length > 0 && <div className="queued-turns" aria-label="待发送消息">
                <div className="queued-turns-heading"><span>待发送 · {session.queuedTurns.length}</span>{session.running
                  ? <small>当前回答完成后依次发送</small>
                  : <button type="button" onClick={() => void session.resumeQueued()} title="继续发送队列">继续发送</button>}</div>
                {session.queuedTurns.map((queued, index) => <div className="queued-turn" key={queued.id}>
                  <span><i>{index + 1}</i>{queued.text}</span>
                  {session.canSteer && <button type="button" onClick={() => void steerQueuedTurn(queued)} aria-label={`引导发送待发送消息：${queued.text}`} title="引导发送">↗</button>}
                  <button type="button" onClick={() => session.removeQueued(queued.id)} aria-label={`取消待发送消息：${queued.text}`} title="取消待发送">×</button>
                </div>)}
              </div>}
              <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setUiError(""); setCommandNotice(""); setSlashMenuForced(false); setSlashMenuDismissed(false); }} onKeyDown={handleComposerKeyDown} placeholder={session.running ? "输入下一条消息，当前回答完成后发送…" : collaborationMode === "plan" ? "描述需要分析和规划的任务…" : currentProjectPath ? "交给 Codex 一个任务，输入 / 使用命令，输入 @ 引用文件…" : "正在准备默认项目目录…"} />
              {currentProjectPath && mentionQuery !== null && <FileMentionMenu query={mentionQuery} results={mentionResults} loading={mentionLoading} onSelect={selectMention} />}
              {slashMenuVisible && <SlashCommandMenu query={slashQuery ?? ""} selectedIndex={slashSelectedIndex} hasThread={Boolean(session.thread)} running={session.running} onSelect={(id) => void runSlashCommand(id, "", !slashMenuForced)} />}
              {commandPanel === "skills" && <SkillPicker selected={skills} loadSkills={session.listSkills} onToggle={toggleSkill} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "mcp" && <McpStatusPanel loadServers={session.listMcpServers} loginServer={session.loginMcpServer} reloadServers={session.reloadMcpServers} readResource={session.readMcpResource} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "goal" && <GoalPanel getGoal={session.getThreadGoal} setGoal={session.setThreadGoal} clearGoal={session.clearThreadGoal} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "review" && <ReviewPanel startReview={session.startReview} onStarted={(delivery) => { setCommandPanel(null); setCommandNotice(delivery === "detached" ? "已打开独立 Review Session。" : "原生代码审查已在当前 Session 启动。"); }} onClose={() => setCommandPanel(null)} />}
              <div className="composer-toolbar">
                <div className="composer-tools">
                  {session.activityLabel && <span className={`steer-mode-indicator ${session.canSteer ? "steerable" : ""}`}><i aria-hidden="true" />{session.activityLabel}</span>}
                  <button ref={commandButtonRef} className={`command-button ${slashMenuVisible || commandPanel ? "active" : ""}`} onClick={() => { setCommandPanel(null); setSlashMenuDismissed(false); setSlashMenuForced((current) => !current); setSlashSelectedIndex(0); }} title="Skills、MCP、计划、压缩与目标">/</button>
                  {collaborationMode === "plan" && <button className="plan-mode-button" onClick={() => { setCollaborationMode("default"); setCommandNotice("已退出计划模式，下一条消息将按默认模式执行。"); }} title="退出计划模式"><span>☷</span>计划模式<i>×</i></button>}
                  <div className="model-picker-anchor">
                    <button className="model-button" onClick={() => setModelPickerOpen((open) => !open)} title="选择模型与推理强度"><span>{modelDisplayName ?? settings.modelId}</span><svg className="chevron-icon" aria-hidden="true" viewBox="0 0 12 12"><path d="m3.5 4.5 2.5 2.5 2.5-2.5" /></svg></button>
                    {modelPickerOpen && <ModelQuickPicker settings={settings} loadModels={session.listModels} onChange={changeModelSettings} onDisplayName={setModelDisplayName} onAdvanced={() => { setModelPickerOpen(false); setSettingsOpen(true); }} onClose={() => setModelPickerOpen(false)} />}
                  </div>
                  <PermissionModeSelector value={permissionMode} onChange={changePermissionMode} />
                </div>
                <div className="composer-actions">
                  <div className="send-mode-anchor">
                    {session.running && <div className="send-mode-menu" role="menu" aria-label="发送方式">
                      <button type="button" role="menuitem" disabled={!draft.trim()} onClick={() => void submitWithMode("queue")}><strong>Queue</strong><small>等待当前任务完成后发送</small></button>
                      <button type="button" role="menuitem" disabled={!draft.trim() || !session.canSteer} onClick={() => void submitWithMode("steer")}><strong>Steer</strong><small>{session.canSteer ? "立即引导当前任务" : "当前阶段不可引导"}</small></button>
                    </div>}
                    <button className="send-button" disabled={!draft.trim()} onClick={() => void submitWithMode("queue")} aria-label={session.running ? "排队发送" : "发送任务"}>↑</button>
                  </div>
                  {session.canInterrupt && <button className="stop-button" onClick={() => void session.interrupt()} aria-label="停止任务">■</button>}
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
          {inspectorTab === "changes" ? <DiffInspector diff={currentDiff} onOpenFile={currentProjectPath ? (path) => {
            const filePath = resolveProjectRelativePath(currentProjectPath, path);
            if (filePath) openWorkspaceExplorer(filePath);
            else setUiError("Diff 文件不在当前项目内，无法预览");
          } : undefined} /> : inspectorTab === "logs" ? (
            <RuntimeLogPanel store={session.runtimeLogStore} />
          ) : (
            <StatusInspector turnCount={session.turns.length} threadId={session.thread?.id ?? null} projectPath={currentProjectPath} projectSource={projectSource} usingDefaultProjectDirectory={usingDefaultProjectDirectory} canUseDefaultProjectDirectory={Boolean(defaultProjectDirectory)} codexHome={session.codexHome} codexHomeDisabled={session.runningThreadCount > 0 || session.submitting} noticeStore={session.runtimeNoticeStore} windowsSandboxReadiness={session.windowsSandboxReadiness} onBrowseProject={() => openWorkspaceExplorer()} onUseDefaultProjectDirectory={() => changeProject(null)} onSetupWindowsSandbox={session.setupWindowsSandbox} onRestart={session.restart} />
          )}
        </aside>
      </section>

      {settingsOpen && <ModelSettingsPanel settings={settings} loadProviderCapabilities={session.readModelProviderCapabilities} onClose={() => setSettingsOpen(false)} onSave={(next, requiresRestart = false) => { setSettings(next); setModelDisplayName(null); setSettingsOpen(false); if (requiresRestart) void session.restart(); }} />}
      <ServerInteractionDialog store={session.interactionStore} />
      {workspaceExplorerOpen && currentProjectPath && <WorkspaceExplorer rootPath={currentProjectPath} initialFilePath={workspaceExplorerInitialPath} onClose={() => setWorkspaceExplorerOpen(false)} readDirectory={session.readWorkspaceDirectory} readFile={session.readWorkspaceFile} watchPath={session.watchWorkspacePath} />}
    </main>
  );
}

export default App;
