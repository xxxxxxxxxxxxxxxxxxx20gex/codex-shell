import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FuzzyFileSearchResult } from "../../generated/app-server/FuzzyFileSearchResult";
import {
  DEFAULT_APPROVAL_REVIEWER,
  DEFAULT_PERMISSION_MODE,
  getApprovalsReviewer,
  getPermissionMode,
  getTurnSandboxPolicy,
  type ApprovalReviewerMode,
  type PermissionMode,
} from "../approvals/permissionModes";
import { commandDisabled } from "../commands/SlashCommandMenu";
import {
  activeSlashCommandQuery,
  matchingSlashCommands,
  parseSlashCommand,
  type SlashCommandId,
} from "../commands/slashCommands";
import { composerSubmitAction } from "../composer/SendModeControl";
import {
  collaborationModeForIntent,
  toggleComposerIntent,
  type ComposerIntent,
  type SelectableComposerIntent,
} from "../composer/composerIntent";
import { useComposerDropPaths } from "../composer/useComposerDropPaths";
import { useResizablePanels } from "../layout/useResizablePanels";
import { activeChannel, activeConversation, reconcileConversation, replaceChannel } from "../models/channels";
import type { ModelSettings, PersonalizationSettings, ProviderSettings } from "../models/types";
import type { PreferencesSection } from "../preferences/PreferencesPanel";
import {
  sendOrQueue,
  type FileMention,
  type ImageAttachment,
  type SkillMention,
  useAgentSession,
} from "../runtime/useAgentSession";
import {
  activeFileMentionQuery,
  type DefaultProjectDirectory,
  replaceActiveFileMention,
  resolveFileSearchPath,
} from "../workspaces/workspaceState";
import { errorMessage } from "../../shared/errors";
import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import { userMessagePresentation } from "../runtime/userMessagePresentation";
import { useDismissiblePopover } from "../../shared/useDismissiblePopover";
import {
  approvalReviewerFromThread,
  permissionModeFromThread,
  providerSettingsFromThread,
} from "../runtime/authoritativeThreadSettings";

const initialProviderSettings: ProviderSettings = {
  schemaVersion: 2,
  activeChannelId: null,
  channels: [],
};

const initialPersonalization: PersonalizationSettings = {
  customInstructions: "",
  theme: "dark",
};

export function queuedTurnLabel(turn: { text: string; mentions: FileMention[]; images?: ImageAttachment[] }) {
  if (turn.text) return turn.text;
  return [...turn.mentions, ...(turn.images ?? [])].map((attachment) => attachment.name).join("、") || "附件";
}

export function useAppController() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferencesMinimized, setPreferencesMinimized] = useState(false);
  const [preferencesSection, setPreferencesSection] = useState<PreferencesSection>("personalization");
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [settings, setSettings] = useState(initialProviderSettings);
  const [settingsReady, setSettingsReady] = useState(false);
  const [personalization, setPersonalization] = useState(initialPersonalization);
  const [modelDisplayName, setModelDisplayName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingMessage, setEditingMessage] = useState<{ threadId: string; turnId: string } | null>(null);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(DEFAULT_PERMISSION_MODE);
  const [approvalReviewer, setApprovalReviewer] = useState<ApprovalReviewerMode>(DEFAULT_APPROVAL_REVIEWER);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);
  const [defaultProjectDirectory, setDefaultProjectDirectory] = useState<DefaultProjectDirectory | null>(null);
  const [workspaceExplorerInitialPath, setWorkspaceExplorerInitialPath] = useState<string | null>(null);
  const [mentions, setMentions] = useState<FileMention[]>([]);
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [skills, setSkills] = useState<SkillMention[]>([]);
  const [mentionResults, setMentionResults] = useState<FuzzyFileSearchResult[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [uiError, setUiError] = useState("");
  const [commandNotice, setCommandNotice] = useState("");
  const [commandPanel, setCommandPanel] = useState<"skills" | "mcp" | "review" | null>(null);
  const [composerIntent, setComposerIntent] = useState<ComposerIntent>("default");
  const [slashMenuDismissed, setSlashMenuDismissed] = useState(false);
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const mentionRequestRef = useRef(0);
  const pendingModelRestartRef = useRef(false);
  const settingsRef = useRef(settings);
  const editSubmittingRef = useRef(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const panels = useResizablePanels();
  const newThreadCwd = pendingProjectPath ?? defaultProjectDirectory?.path ?? null;
  const conversation = activeConversation(settings);
  const session = useAgentSession(conversation, permissionMode, approvalReviewer, newThreadCwd, personalization, settingsReady);
  const listAvailableSkills = session.listSkills;
  useEffect(() => {
    if (!session.skillsRevision) return;
    let active = true;
    void listAvailableSkills(true).then((items) => {
      if (active) setSkills((selected) => selected.filter((skill) => items.some((item) => item.path === skill.path && item.enabled)));
    }).catch((error) => { if (active) setUiError(errorMessage(error)); });
    return () => { active = false; };
  }, [session.skillsRevision, listAvailableSkills]);
  const restartSession = session.restart;
  const listModels = session.listModels;
  const searchFiles = session.searchFiles;
  const currentProjectPath = session.thread?.cwd ? String(session.thread.cwd) : newThreadCwd;
  const mentionQuery = activeFileMentionQuery(draft);
  const typedSlashQuery = activeSlashCommandQuery(draft);
  const slashQuery = slashMenuDismissed ? null : typedSlashQuery;
  const collaborationMode = collaborationModeForIntent(composerIntent);
  const slashCommands = slashQuery === null ? [] : matchingSlashCommands(slashQuery);
  const slashMenuVisible = commandPanel === null && slashQuery !== null;
  const authoritativeThreadSettings = session.threadSettings;
  const activeThreadId = session.thread?.id ?? null;
  const readAuthoritativeGoal = session.getThreadGoal;
  const persistProviderSettings = useCallback((next: ProviderSettings) => {
    if ("__TAURI_INTERNALS__" in window) {
      void invoke("save_model_settings", { settings: next }).catch((error) => setUiError(errorMessage(error)));
    }
  }, []);

  function changeModelSettings(next: ModelSettings) {
    const channel = activeChannel(settings);
    if (!channel) return;
    const nextSettings = replaceChannel(settings, { ...channel, conversation: next });
    setSettings(nextSettings);
    persistProviderSettings(nextSettings);
    if (session.thread) {
      void session.updateThreadSettings({
        model: next.modelId || null,
        effort: next.reasoningEffort,
        summary: next.reasoningSummary,
        serviceTier: next.serviceTier === "default" ? null : next.serviceTier,
        approvalPolicy: getPermissionMode(permissionMode).approvalPolicy,
        approvalsReviewer: getApprovalsReviewer(permissionMode, approvalReviewer),
        sandboxPolicy: getTurnSandboxPolicy(permissionMode),
      }).catch((error) => setUiError(`Session 设置未能同步到 app-server：${errorMessage(error)}`));
    }
  }

  function saveModelSettings(next: ModelSettings, requiresRestart = false) {
    const channel = activeChannel(settings);
    if (!channel) return;
    const nextSettings = replaceChannel(settings, { ...channel, conversation: next });
    setSettings(nextSettings);
    setModelDisplayName(null);
    persistProviderSettings(nextSettings);
    if (requiresRestart) pendingModelRestartRef.current = true;
  }

  async function saveProviderSettings(next: ProviderSettings, requiresRestart = false) {
    if ("__TAURI_INTERNALS__" in window) {
      await invoke("save_model_settings", { settings: next });
    }
    setSettings(next);
    setModelDisplayName(null);
    if (requiresRestart) pendingModelRestartRef.current = true;
  }

  async function savePersonalization(next: PersonalizationSettings) {
    if ("__TAURI_INTERNALS__" in window) {
      await invoke("save_personalization_settings", { settings: next });
    }
    setPersonalization(next);
  }

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setSettingsReady(true);
      return;
    }
    let active = true;
    const loadSettings = invoke<ProviderSettings>("load_model_settings")
      .then((loaded) => { if (active) setSettings(loaded); })
      .catch(() => undefined);
    const loadPersonalization = invoke<PersonalizationSettings>("load_personalization_settings")
      .then((loaded) => { if (active) setPersonalization(loaded); })
      .catch(() => undefined);
    const loadProjectDirectory = invoke<DefaultProjectDirectory>("get_default_project_directory")
      .then((directory) => { if (active) setDefaultProjectDirectory(directory); })
      .catch((error) => { if (active) setUiError(errorMessage(error)); });
    void Promise.allSettled([loadSettings, loadPersonalization, loadProjectDirectory])
      .then(() => { if (active) setSettingsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  /**
   * 把当前激活渠道的参数收敛到它自己的模型目录。
   *
   * 渠道切换会换掉整个模型目录，旧渠道的模型与推理档位可能不存在。校准必须发生在
   * 执行核心按新渠道重启之后：重启前进程仍在用上一个渠道的目录，此时校准会把新渠道
   * 刚调好的参数改写成旧目录里的模型。校准只写当前激活渠道，其他渠道不受影响。
   */
  const calibrateActiveChannel = useCallback(async () => {
    const channelId = settingsRef.current.activeChannelId;
    if (!channelId) return;
    try {
      const models = await listModels();
      const channel = settingsRef.current.channels.find((item) => item.id === channelId);
      if (!channel) return;
      const reconciled = reconcileConversation(channel.conversation, models);
      if (!reconciled) return;
      const next = replaceChannel(settingsRef.current, { ...channel, conversation: reconciled });
      setSettings(next);
      persistProviderSettings(next);
    } catch {
      // 校准失败不阻断使用：保留用户当前参数，下次切换渠道时再校准。
    }
  }, [listModels, persistProviderSettings]);

  useEffect(() => {
    if (!settingsReady || !pendingModelRestartRef.current) return;
    pendingModelRestartRef.current = false;
    void restartSession().then(() => calibrateActiveChannel());
  }, [calibrateActiveChannel, restartSession, settings, settingsReady]);

  useEffect(() => {
    if (!authoritativeThreadSettings) return;
    setSettings((current) => providerSettingsFromThread(current, authoritativeThreadSettings));
    setPermissionMode(permissionModeFromThread(authoritativeThreadSettings));
    setApprovalReviewer(approvalReviewerFromThread(authoritativeThreadSettings));
    setModelDisplayName(null);
  }, [authoritativeThreadSettings]);

  useEffect(() => {
    setUiError("");
    setSkills([]);
    setEditingMessage(null);
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    void readAuthoritativeGoal().catch((error) => setUiError(errorMessage(error)));
  }, [activeThreadId, readAuthoritativeGoal]);

  useEffect(() => {
    const requestId = ++mentionRequestRef.current;
    if (!currentProjectPath || mentionQuery === null) {
      setMentionResults([]);
      setMentionLoading(false);
      return;
    }
    setMentionLoading(true);
    const timeout = window.setTimeout(() => {
      void searchFiles(mentionQuery).then((results) => {
        if (mentionRequestRef.current === requestId) setMentionResults(results);
      }).catch((error) => {
        if (mentionRequestRef.current === requestId) setUiError(errorMessage(error));
      }).finally(() => {
        if (mentionRequestRef.current === requestId) setMentionLoading(false);
      });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [currentProjectPath, mentionQuery, searchFiles]);

  useEffect(() => setSlashSelectedIndex(0), [slashQuery]);

  useDismissiblePopover<HTMLDivElement>({
    open: slashMenuVisible || commandPanel !== null,
    onClose: () => {
      setSlashMenuDismissed(true);
      setCommandPanel(null);
    },
    isInside: (target) => target instanceof Element && Boolean(target.closest(".slash-command-menu, .agent-command-panel, .composer-add-menu")),
  });

  async function selectComposerIntent(selected: SelectableComposerIntent, toggle = true) {
    if (session.running) throw new Error("当前任务完成后才能切换计划或目标模式");
    const next = toggle ? toggleComposerIntent(composerIntent, selected) : selected;
    if (next === "plan" && composerIntent !== "plan" && session.thread) {
      const activeGoal = session.threadGoal ?? await session.getThreadGoal();
      if (activeGoal) await session.clearThreadGoal();
    }
    setComposerIntent(next);
    setCommandNotice("");
    return next;
  }

  async function submitGoal(objective: string) {
    if (mentions.length > 0 || images.length > 0 || skills.length > 0) {
      throw new Error("目标模式目前只支持文字；请移除附件和 Skill 后再提交目标");
    }
    if (!session.thread) {
      const sent = await session.send(objective, [], [], "default", [], objective);
      if (!sent) throw new Error("目标消息未能发送，请重试");
    } else {
      await session.setThreadGoal(objective);
      const sent = await session.send(objective, [], [], "default");
      if (!sent) throw new Error("目标消息未能发送，请重试");
    }
    setDraft("");
    setSkills([]);
    setMentionResults([]);
    setComposerIntent("default");
    setCommandNotice("");
  }

  async function clearActiveGoal() {
    try {
      if (await session.clearThreadGoal()) {
        setCommandNotice("当前 Session 的长期目标已清除。");
      }
    } catch (error) {
      setUiError(errorMessage(error));
    }
  }

  async function runSlashCommand(id: SlashCommandId, args = "", clearDraft = true) {
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
        await selectComposerIntent("plan", !args);
        if (!args) return;
        if (await session.send(args, mentions, skills, "plan", images)) {
          setMentions([]);
          setSkills([]);
          setImages([]);
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
      if (!args) {
        await selectComposerIntent("goal");
        return;
      }
      if (args.toLocaleLowerCase() === "clear") {
        if (!session.thread) throw new Error("当前没有可清除目标的 Session");
        await session.clearThreadGoal();
        setComposerIntent("default");
        setCommandNotice("当前 Session 的长期目标已清除。");
      } else {
        await selectComposerIntent("goal", false);
        await submitGoal(args);
      }
    } catch (error) {
      setUiError(errorMessage(error));
    }
  }

  async function submit() {
    const message = draft.trim();
    if (!message && mentions.length === 0 && images.length === 0) return;
    if (editingMessage) {
      if (editSubmittingRef.current) return;
      editSubmittingRef.current = true;
      try {
        await session.revertLastMessage(editingMessage.threadId, editingMessage.turnId);
        setEditingMessage(null);
        if (await session.send(message, mentions, skills, collaborationMode, images)) {
          setDraft(""); setMentions([]); setImages([]); setSkills([]); setCommandNotice("");
        }
      } catch (error) { setUiError(errorMessage(error)); }
      finally { editSubmittingRef.current = false; }
      return;
    }
    const command = parseSlashCommand(message);
    if (command) {
      await runSlashCommand(command.id, command.args);
      return;
    }
    if (composerIntent === "goal") {
      try {
        await submitGoal(message);
      } catch (error) {
        setUiError(errorMessage(error));
      }
      return;
    }
    if (await sendOrQueue(session, message, mentions, skills, collaborationMode, images)) {
      setDraft("");
      setMentions([]);
      setSkills([]);
      setImages([]);
      setMentionResults([]);
      setCommandNotice("");
    } else if (session.running) {
      setUiError("当前消息未能加入发送队列");
    }
  }

  async function steerCurrentTurn() {
    const message = draft.trim();
    if ((!message && mentions.length === 0 && images.length === 0) || !session.canSteer) return;
    setCommandNotice("正在发送引导消息…");
    if (await session.steer(message, mentions, skills, images)) {
      setDraft("");
      setMentions([]);
      setSkills([]);
      setImages([]);
      setMentionResults([]);
      setCommandNotice("引导消息已发送，正在处理…");
    } else {
      setCommandNotice("");
    }
  }

  async function steerQueuedTurn(queued: (typeof session.queuedTurns)[number]) {
    if (!session.canSteer) return;
    if (await session.steer(queued.text, queued.mentions, queued.skills, queued.images)) {
      session.removeQueued(queued.id);
    }
  }

  async function submitWithMode(mode: "queue" | "steer") {
    if (editingMessage) { await submit(); return; }
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
    setImages([]);
    setCommandPanel(null);
    setSlashMenuDismissed(false);
    setCommandNotice("");
    setComposerIntent("default");
    setPendingProjectPath(null);
    session.startNewTask();
  }

  async function startSkillTask() {
    startNewTask();
    try {
      const available = await session.listSkills(true);
      const managementSkills = available.filter((skill) => skill.enabled && /skill[- ]?(?:installer|creator)|(?:安装|创建).*skill/i.test(`${skill.name} ${skill.description}`));
      setSkills(managementSkills.slice(0, 2).map((skill) => ({ name: skill.name, path: skill.path })));
    } catch (error) {
      setUiError(errorMessage(error));
    }
  }

  function changePermissionMode(next: PermissionMode) {
    if (next === permissionMode) return;
    setPermissionMode(next);
    setCommandNotice("权限设置将在当前 Session 的下一条消息生效。");
    if (session.thread) {
      const mode = getPermissionMode(next);
      void session.updateThreadSettings({
        approvalPolicy: mode.approvalPolicy,
        approvalsReviewer: getApprovalsReviewer(next, approvalReviewer),
        sandboxPolicy: getTurnSandboxPolicy(next),
      }).catch((error) => setUiError(`权限设置未能同步到 app-server：${errorMessage(error)}`));
    }
  }

  function changeApprovalReviewer(next: ApprovalReviewerMode) {
    if (next === approvalReviewer) return;
    setApprovalReviewer(next);
    setCommandNotice(next === "auto_review"
      ? "自动风险审查将在下一条消息生效。"
      : "受保护操作将在下一条消息起由你审批。");
    if (session.thread) {
      void session.updateThreadSettings({ approvalsReviewer: getApprovalsReviewer(permissionMode, next) })
        .catch((error) => setUiError(`审批策略未能同步到 app-server：${errorMessage(error)}`));
    }
  }

  function changeProject(path: string | null) {
    if (session.thread) return;
    setWorkspaceExplorerInitialPath(null);
    setMentions([]);
    setMentionResults([]);
    setPendingProjectPath(path);
  }

  function openWorkspaceExplorer(initialFilePath: string | null = null) {
    setWorkspaceExplorerInitialPath(initialFilePath);
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

  function addImages(paths: string[]) {
    setImages((current) => [...current, ...paths.filter((path) => !current.some((item) => item.path === path)).map((path) => ({ name: path.split(/[\\/]/).pop() || path, path }))]);
    setUiError("");
  }

  async function handleComposerPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(event.clipboardData.items).find((entry) => entry.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("无法读取剪贴板图片"));
        reader.onerror = () => reject(reader.error ?? new Error("无法读取剪贴板图片"));
        reader.readAsDataURL(file);
      });
      setImages((current) => [...current, { name: `粘贴图片 ${current.length + 1}`, url }]);
      setUiError("");
    } catch (error) {
      setUiError(errorMessage(error));
    }
  }

  function addFiles(paths: string[]) {
    setMentions((current) => [...current, ...paths.filter((path) => !current.some((item) => item.path === path)).map((path) => ({ name: path.split(/[\\/]/).pop() || path, path }))]);
    setUiError("");
  }

  function addDroppedPaths(paths: string[]) {
    const imagePaths = paths.filter((path) => /\.(avif|png|jpe?g|gif|webp|bmp)$/i.test(path));
    const filePaths = paths.filter((path) => !imagePaths.includes(path));
    addImages(imagePaths);
    addFiles(filePaths);
  }

  useComposerDropPaths(composerRef, addDroppedPaths, setUiError);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
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
          void runSlashCommand(command.id);
        }
        return;
      }
    }
    const action = composerSubmitAction(event, session.canSteer);
    if (!action) return;
    event.preventDefault();
    if (action === "steerUnavailable") {
      setUiError("当前阶段不可引导");
      return;
    }
    if (action === "steer") {
      void submitWithMode("steer");
      return;
    }
    void submitWithMode("queue");
  }

  function toggleSkill(skill: SkillMention) {
    setSkills((current) => current.some((item) => item.path === skill.path)
      ? current.filter((item) => item.path !== skill.path)
      : [...current, skill]);
  }

  async function setSkillEnabled(path: string, enabled: boolean) {
    const effectiveEnabled = await session.setSkillEnabled(path, enabled);
    if (!effectiveEnabled) setSkills((selected) => selected.filter((item) => item.path !== path));
    return effectiveEnabled;
  }

  function openPreferences(section: PreferencesSection = "personalization") {
    setPreferencesSection(section);
    setPreferencesMinimized(false);
    setPreferencesOpen(true);
  }

  function editQueuedTurn(turn: (typeof session.queuedTurns)[number]) {
    setDraft(turn.text); setMentions(turn.mentions); setImages(turn.images ?? []); setSkills(turn.skills);
    const channel = activeChannel(settings);
    if (channel) {
      const restored = replaceChannel(settings, { ...channel, conversation: turn.settings });
      setSettings(restored);
      persistProviderSettings(restored);
    }
    setPermissionMode(turn.permissionMode); setApprovalReviewer(turn.approvalReviewer);
    setComposerIntent(turn.collaborationMode === "plan" ? "plan" : "default"); session.removeQueued(turn.id);
  }

  function editLastMessage(item: Extract<ThreadItem, { type: "userMessage" }>) {
    const turn = session.turns[session.turns.length - 1];
    if (!session.thread || session.running || session.submitting || !turn || turn.status === "inProgress") return;
    if (turn.items.filter((entry) => entry.type === "userMessage").length !== 1 || !turn.items.some((entry) => entry.id === item.id)) {
      setUiError("该回合包含追加指令，暂不支持单独替换其中一条消息。");
      return;
    }
    if (draft || mentions.length || images.length || skills.length) {
      setUiError("请先发送或清空当前草稿，再编辑历史消息。");
      return;
    }
    const message = userMessagePresentation(item);
    setEditingMessage({ threadId: session.thread.id, turnId: turn.id });
    setDraft(message.text);
    setMentions(message.files);
    setImages(message.images);
    setSkills(item.content.flatMap((content) => content.type === "skill" ? [{ name: content.name, path: content.path }] : []));
    setCommandNotice("正在编辑最后一条消息：发送将替换该回合历史，不撤销文件变更。");
    composerRef.current?.querySelector("textarea")?.focus();
  }

  return {
    ...panels,
    session,
    settingsOpen,
    setSettingsOpen,
    preferencesOpen,
    setPreferencesOpen,
    preferencesMinimized,
    setPreferencesMinimized,
    preferencesSection,
    openPreferences,
    modelPickerOpen,
    setModelPickerOpen,
    settings,
    conversation,
    setSettings,
    saveModelSettings,
    saveProviderSettings,
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
    composerRef,
    currentProjectPath,
    mentionQuery,
    slashQuery,
    slashMenuVisible,
    runSlashCommand,
    submitWithMode,
    steerQueuedTurn,
    editQueuedTurn,
    editLastMessage,
    editingMessage,
    cancelMessageEdit: () => { setEditingMessage(null); setDraft(""); setMentions([]); setImages([]); setSkills([]); setCommandNotice(""); },
    startNewTask,
    startSkillTask,
    changePermissionMode,
    changeApprovalReviewer,
    changeProject,
    openWorkspaceExplorer,
    selectMention,
    addDroppedPaths,
    handleComposerPaste,
    handleComposerKeyDown,
    toggleSkill,
    setSkillEnabled,
    clearActiveGoal,
  };
}
