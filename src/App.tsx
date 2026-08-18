import {
  ArrowUpRight,
  Clock3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Settings,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import "./App.css";
import { PermissionModeSelector } from "./features/approvals/PermissionModeSelector";
import { AttachmentGallery } from "./features/attachments/AttachmentGallery";
import { McpStatusPanel } from "./features/commands/McpStatusPanel";
import { ReviewPanel } from "./features/commands/ReviewPanel";
import { SkillPicker } from "./features/commands/SkillPicker";
import { SendModeControl } from "./features/composer/SendModeControl";
import { ComposerAddMenu } from "./features/composer/ComposerAddMenu";
import { ComposerIntentControl } from "./features/composer/ComposerIntentControl";
import { SlashCommandMenu } from "./features/commands/SlashCommandMenu";
import { DiffInspector } from "./features/diff/DiffInspector";
import { ModelSettingsPanel } from "./features/models/ModelSettingsPanel";
import { ModelQuickPicker } from "./features/models/ModelQuickPicker";
import { modelIdDisplayName } from "./features/models/modelPresentation";
import { PreferencesPanel } from "./features/preferences/PreferencesPanel";
import { RuntimeLogPanel } from "./features/runtime/RuntimeLogPanel";
import { RuntimeNoticeBanner } from "./features/runtime/RuntimeNoticeBanner";
import { StatusInspector } from "./features/runtime/StatusInspector";
import { queuedTurnLabel, useAppController } from "./features/app/useAppController";
import { ServerInteractionDialog } from "./features/interactions/ServerInteractionDialog";
import { ConversationTimeline } from "./features/threads/ConversationTimeline";
import { ContextHeatBar } from "./features/threads/ContextHeatBar";
import { ThreadHistoryList } from "./features/threads/ThreadHistoryList";
import { threadTitle } from "./features/threads/threadPresentation";
import { FileMentionMenu } from "./features/workspaces/FileMentionMenu";
import { WorkspaceExplorer } from "./features/workspaces/WorkspaceExplorer";
import { WorkspaceSelector } from "./features/workspaces/WorkspaceSelector";
import { WindowTitleBar } from "./features/window/WindowTitleBar";
import "./styles/tokens.css";
import { isPathWithinRoot, resolveLinkedProjectPath, resolveProjectRelativePath } from "./features/workspaces/workspaceState";

function App() {
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
    session,
    settingsOpen,
    setSettingsOpen,
    preferencesOpen,
    setPreferencesOpen,
    modelPickerOpen,
    setModelPickerOpen,
    settings,
    setSettings,
    personalization,
    savePersonalization,
    modelDisplayName,
    setModelDisplayName,
    changeModelSettings,
    draft,
    setDraft,
    permissionMode,
    approvalReviewer,
    pendingProjectPath,
    defaultProjectDirectory,
    workspaceExplorerOpen,
    setWorkspaceExplorerOpen,
    workspaceExplorerInitialPath,
    mentions,
    setMentions,
    images,
    setImages,
    skills,
    mentionResults,
    mentionLoading,
    uiError,
    setUiError,
    commandNotice,
    setCommandNotice,
    commandPanel,
    setCommandPanel,
    composerIntent,
    setComposerIntent,
    setSlashMenuDismissed,
    slashSelectedIndex,
    inspectorTab,
    setInspectorTab,
    composerRef,
    currentProjectPath,
    usingDefaultProjectDirectory,
    projectSource,
    mentionQuery,
    slashQuery,
    slashMenuVisible,
    currentDiff,
    runSlashCommand,
    submitWithMode,
    steerQueuedTurn,
    startNewTask,
    changePermissionMode,
    changeApprovalReviewer,
    changeProject,
    openWorkspaceExplorer,
    selectMention,
    addDroppedPaths,
    handleComposerPaste,
    handleComposerKeyDown,
    toggleSkill,
  } = useAppController();

  async function openConversationPath(path: string) {
    const resolvedPath = currentProjectPath
      ? resolveLinkedProjectPath(currentProjectPath, path)
      : null;
    if (!resolvedPath) throw new Error("相对文件路径需要先选择项目");
    if (currentProjectPath && isPathWithinRoot(currentProjectPath, resolvedPath)) {
      openWorkspaceExplorer(resolvedPath);
      return;
    }
    await revealItemInDir(resolvedPath);
  }

  return (
    <main className="app-shell" data-theme={personalization.theme}>
      <WindowTitleBar />
      <section
        ref={workspaceGridRef}
        className={`workspace-grid ${sidebarOpen ? "" : "sidebar-hidden"} ${inspectorOpen ? "" : "inspector-hidden"} ${resizingPanel ? "resizing" : ""}`}
        style={workspaceGridStyle}
      >
        <aside className="sidebar panel">
          <header className="sidebar-header">
            <span className="brand-mark" aria-hidden="true">C</span>
            <strong>Codex Shell</strong>
          </header>
          <div className="new-task-wrap">
            <button className="new-task" onClick={startNewTask} disabled={session.submitting || session.openingThreadId !== null || session.threadActionId !== null}>
              <MessageSquarePlus aria-hidden="true" />
              <span>新建对话</span>
            </button>
          </div>
          <ThreadHistoryList
            threads={session.history}
            archived={session.historyArchived}
            activeThreadId={session.thread?.id ?? null}
            loading={session.historyLoading}
            error={session.historyError}
            disabled={session.submitting || session.openingThreadId !== null || session.threadActionId !== null}
            actionThreadId={session.threadActionId}
            runningThreadIds={session.runningThreadIds}
            hasMore={session.historyHasMore}
            onOpen={(threadId) => { setComposerIntent("default"); void session.openThread(threadId); }}
            onRename={(threadId, name) => void session.renameThread(threadId, name)}
            onTogglePin={(thread) => void session.toggleThreadPin(thread)}
            onArchive={(threadId) => void session.archiveThread(threadId)}
            onUnarchive={(threadId) => void session.unarchiveThread(threadId)}
            onDelete={(threadId) => void session.deleteThread(threadId)}
            onShowArchived={session.showArchivedHistory}
            onLoadMore={() => void session.loadMoreHistory()}
          />
          <button className="sidebar-footer" onClick={() => setPreferencesOpen(true)} aria-label="打开设置" title="设置">
            <Settings aria-hidden="true" />
            <span><strong>{providerDisplayName(settings.baseUrl)}</strong></span>
          </button>
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
            {sidebarOpen ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
        </div>

        <section className="conversation panel">
          <header className="conversation-header" title={session.thread?.id}>
            <strong>{session.thread ? threadTitle(session.thread) : "新对话"}</strong>
            {session.thread && <span>{session.thread.id.slice(0, 8)}…{session.thread.id.slice(-4)}</span>}
          </header>
          {session.turns.length > 0 ? (
            <ConversationTimeline
              key={session.thread?.id ?? "new"}
              turns={session.turns}
              running={session.running}
              threadId={session.thread?.id}
              forkDisabled={session.submitting || session.openingThreadId !== null || session.threadActionId !== null}
              onFork={(threadId, lastTurnId) => void session.forkThread(threadId, lastTurnId)}
              plansByTurnId={session.plansByTurnId}
              activeItemTurnIds={session.activeItemTurnIds}
              mcpProgressByItemId={session.mcpProgressByItemId}
              readFile={session.readWorkspaceFile}
              onOpenPath={openConversationPath}
              onOpenError={setUiError}
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
            {!session.thread && <WorkspaceSelector
              path={pendingProjectPath}
              disabled={session.submitting || session.openingThreadId !== null}
              onChange={changeProject}
              onError={setUiError}
            />}
            <div ref={composerRef} className="composer has-context-heatbar">
              <ContextHeatBar usage={session.tokenUsage} hasThread={Boolean(session.thread)} running={session.running} onCompact={() => runSlashCommand("compact", "", false)} />
              {skills.length > 0 && <div className="mention-chips">
                {skills.map((skill) => <span className="skill-chip" key={skill.path} title={skill.path}><Sparkles aria-hidden="true" />{skill.name}<button type="button" aria-label={`移除 Skill ${skill.name}`} onClick={() => toggleSkill(skill)}><X aria-hidden="true" /></button></span>)}
              </div>}
              <AttachmentGallery
                files={mentions}
                images={images}
                readFile={session.readWorkspaceFile}
                onRemoveFile={(path) => setMentions((current) => current.filter((item) => item.path !== path))}
                onRemoveImage={(index) => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              />
              {session.queuedTurns.length > 0 && <div className="queued-turns" aria-label="待发送消息">
                <div className="queued-turns-heading"><span>待发送 · {session.queuedTurns.length}</span>{session.running
                  ? <small>当前回答完成后依次发送</small>
                  : <button type="button" onClick={() => void session.resumeQueued()} title="继续发送队列">继续发送</button>}</div>
                {session.queuedTurns.map((queued) => {
                  const label = queuedTurnLabel(queued);
                  return <div className="queued-turn" key={queued.id}>
                    <Clock3 className="queued-turn-icon" aria-hidden="true" />
                    <span>{label}</span>
                    <small className="queued-turn-status">等待中</small>
                    {session.canSteer && <button type="button" onClick={() => void steerQueuedTurn(queued)} aria-label={`引导发送待发送消息：${label}`} title="引导发送"><ArrowUpRight aria-hidden="true" /></button>}
                    <button type="button" onClick={() => session.removeQueued(queued.id)} aria-label={`取消待发送消息：${label}`} title="取消待发送"><X aria-hidden="true" /></button>
                  </div>;
                })}
              </div>}
              <textarea value={draft} onChange={(event) => { setDraft(event.target.value); setUiError(""); setCommandNotice(""); setSlashMenuDismissed(false); }} onPaste={(event) => void handleComposerPaste(event)} onKeyDown={handleComposerKeyDown} placeholder={session.running ? "输入下一条消息，当前回答完成后发送…" : composerIntent === "goal" ? "描述你的目标，最好包含可衡量的结果…" : composerIntent === "plan" ? "描述需要分析和规划的任务…" : currentProjectPath ? "交给 Codex 一个任务，输入 / 使用命令，输入 @ 引用文件…" : "正在准备默认项目目录…"} />
              {currentProjectPath && mentionQuery !== null && <FileMentionMenu query={mentionQuery} results={mentionResults} loading={mentionLoading} onSelect={selectMention} />}
              {slashMenuVisible && <SlashCommandMenu query={slashQuery ?? ""} selectedIndex={slashSelectedIndex} hasThread={Boolean(session.thread)} running={session.running} onSelect={(id) => void runSlashCommand(id)} />}
              {commandPanel === "skills" && <SkillPicker selected={skills} loadSkills={session.listSkills} onToggle={toggleSkill} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "mcp" && <McpStatusPanel loadServers={session.listMcpServers} loginServer={session.loginMcpServer} reloadServers={session.reloadMcpServers} readResource={session.readMcpResource} onClose={() => setCommandPanel(null)} />}
              {commandPanel === "review" && <ReviewPanel startReview={session.startReview} onStarted={(delivery) => { setCommandPanel(null); setCommandNotice(delivery === "detached" ? "已打开独立 Review Session。" : "原生代码审查已在当前 Session 启动。"); }} onClose={() => setCommandPanel(null)} />}
              <div className="composer-toolbar">
                <div className="composer-tools">
                  <ComposerAddMenu
                    hasThread={Boolean(session.thread)}
                    running={session.running}
                    onSelectPaths={addDroppedPaths}
                    onCommand={(id) => void runSlashCommand(id, "", false)}
                    onError={setUiError}
                    onOpen={() => { setModelPickerOpen(false); setCommandPanel(null); setSlashMenuDismissed(true); }}
                  />
                  <PermissionModeSelector
                    value={permissionMode}
                    reviewer={approvalReviewer}
                    onChange={changePermissionMode}
                    onReviewerChange={changeApprovalReviewer}
                  />
                  {composerIntent !== "default" && <ComposerIntentControl intent={composerIntent} onClear={() => { setComposerIntent("default"); setCommandNotice(""); }} />}
                  {session.activityLabel && <span className={`steer-mode-indicator ${session.canSteer ? "steerable" : ""}`}><i aria-hidden="true" />{session.activityLabel}</span>}
                </div>
                <div className="composer-actions">
                  <div className="model-picker-anchor">
                    <button className="model-button" onClick={() => setModelPickerOpen((open) => !open)} title="选择模型与推理强度"><span>{modelDisplayName ?? modelIdDisplayName(settings.modelId)}</span>{settings.reasoningEffort && <small>{settings.reasoningEffort}</small>}<ChevronDown className="chevron-icon" aria-hidden="true" /></button>
                    {modelPickerOpen && <ModelQuickPicker settings={settings} loadModels={session.listModels} onChange={changeModelSettings} onDisplayName={setModelDisplayName} onAdvanced={() => { setModelPickerOpen(false); setSettingsOpen(true); }} onClose={() => setModelPickerOpen(false)} />}
                  </div>
                  <SendModeControl
                    canSteer={session.canSteer}
                    hasDraft={Boolean(draft.trim() || mentions.length > 0 || images.length > 0)}
                    running={session.running}
                    onQueue={() => void submitWithMode("queue")}
                    onSteer={() => void submitWithMode("steer")}
                  />
                  {session.canInterrupt && <button className="stop-button" onClick={() => void session.interrupt()} aria-label="停止任务" title="停止任务"><Square aria-hidden="true" /></button>}
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
            {inspectorOpen ? <ChevronRight aria-hidden="true" /> : <ChevronLeft aria-hidden="true" />}
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
            <StatusInspector turnCount={session.turns.length} threadId={session.thread?.id ?? null} projectPath={currentProjectPath} projectSource={projectSource} usingDefaultProjectDirectory={usingDefaultProjectDirectory} canUseDefaultProjectDirectory={Boolean(defaultProjectDirectory && !session.thread)} codexHome={session.codexHome} codexHomeDisabled={session.runningThreadCount > 0 || session.submitting} noticeStore={session.runtimeNoticeStore} windowsSandboxReadiness={session.windowsSandboxReadiness} onBrowseProject={() => openWorkspaceExplorer()} onUseDefaultProjectDirectory={() => changeProject(null)} onSetupWindowsSandbox={session.setupWindowsSandbox} onRestart={session.restart} />
          )}
        </aside>
      </section>

      {settingsOpen && <ModelSettingsPanel settings={settings} loadProviderCapabilities={session.readModelProviderCapabilities} onClose={() => setSettingsOpen(false)} onSave={(next, requiresRestart = false) => { setSettings(next); setModelDisplayName(null); setSettingsOpen(false); if (requiresRestart) void session.restart(); }} />}
      {preferencesOpen && <PreferencesPanel settings={personalization} onClose={() => setPreferencesOpen(false)} onSave={async (next) => { await savePersonalization(next); setPreferencesOpen(false); }} />}
      <ServerInteractionDialog store={session.interactionStore} />
      {workspaceExplorerOpen && currentProjectPath && <WorkspaceExplorer rootPath={currentProjectPath} initialFilePath={workspaceExplorerInitialPath} onClose={() => setWorkspaceExplorerOpen(false)} readDirectory={session.readWorkspaceDirectory} readFile={session.readWorkspaceFile} watchPath={session.watchWorkspacePath} />}
    </main>
  );
}

function providerDisplayName(baseUrl: string) {
  try {
    const host = new URL(baseUrl).hostname;
    const label = host.split(".")[0]?.replace(/-/g, "_");
    return label || "设置";
  } catch {
    return "设置";
  }
}

export default App;
