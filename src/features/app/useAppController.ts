import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FuzzyFileSearchResult } from "../../generated/app-server/FuzzyFileSearchResult";
import {
  DEFAULT_APPROVAL_REVIEWER,
  DEFAULT_PERMISSION_MODE,
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
import type { ModelSettings, PersonalizationSettings } from "../models/types";
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
  isDefaultProjectPath,
  replaceActiveFileMention,
  resolveFileSearchPath,
} from "../workspaces/workspaceState";
import { errorMessage } from "../../shared/errors";
import { useDismissiblePopover } from "../../shared/useDismissiblePopover";

const initialSettings: ModelSettings = {
  baseUrl: "https://api.openai.com/v1",
  modelId: "gpt-5.6-sol",
  reasoningEffort: null,
  reasoningSummary: null,
  verbosity: null,
  serviceTier: "default",
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
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [personalization, setPersonalization] = useState(initialPersonalization);
  const [modelDisplayName, setModelDisplayName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(DEFAULT_PERMISSION_MODE);
  const [approvalReviewer, setApprovalReviewer] = useState<ApprovalReviewerMode>(DEFAULT_APPROVAL_REVIEWER);
  const [pendingProjectPath, setPendingProjectPath] = useState<string | null>(null);
  const [defaultProjectDirectory, setDefaultProjectDirectory] = useState<DefaultProjectDirectory | null>(null);
  const [workspaceExplorerOpen, setWorkspaceExplorerOpen] = useState(false);
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
  const [inspectorTab, setInspectorTab] = useState<"changes" | "status" | "logs">("changes");
  const mentionRequestRef = useRef(0);
  const composerRef = useRef<HTMLDivElement>(null);
  const panels = useResizablePanels();
  const newThreadCwd = pendingProjectPath ?? defaultProjectDirectory?.path ?? null;
  const session = useAgentSession(settings, permissionMode, approvalReviewer, newThreadCwd, personalization);
  const searchFiles = session.searchFiles;
  const currentProjectPath = session.thread?.cwd ? String(session.thread.cwd) : newThreadCwd;
  const usingDefaultProjectDirectory = Boolean(
    currentProjectPath
    && defaultProjectDirectory
    && isDefaultProjectPath(currentProjectPath, defaultProjectDirectory.rootPath),
  );
  const projectSource: "waiting" | "default" | "thread" | "selected" = currentProjectPath
    ? (usingDefaultProjectDirectory ? "default" : session.thread ? "thread" : "selected")
    : "waiting";
  const mentionQuery = activeFileMentionQuery(draft);
  const typedSlashQuery = activeSlashCommandQuery(draft);
  const slashQuery = slashMenuDismissed ? null : typedSlashQuery;
  const collaborationMode = collaborationModeForIntent(composerIntent);
  const slashCommands = slashQuery === null ? [] : matchingSlashCommands(slashQuery);
  const slashMenuVisible = commandPanel === null && slashQuery !== null;
  const currentDiff = useMemo(() => {
    for (let index = session.turns.length - 1; index >= 0; index -= 1) {
      const diff = session.diffsByTurnId[session.turns[index].id];
      if (diff) return diff;
    }
    return "";
  }, [session.diffsByTurnId, session.turns]);

  function changeModelSettings(next: ModelSettings) {
    setSettings(next);
    if ("__TAURI_INTERNALS__" in window) {
      void invoke("save_model_settings", { settings: next }).catch((error) => setUiError(errorMessage(error)));
    }
  }

  async function savePersonalization(next: PersonalizationSettings) {
    if ("__TAURI_INTERNALS__" in window) {
      await invoke("save_personalization_settings", { settings: next });
    }
    setPersonalization(next);
  }

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    void invoke<ModelSettings>("load_model_settings").then(setSettings).catch(() => undefined);
    void invoke<PersonalizationSettings>("load_personalization_settings").then(setPersonalization).catch(() => undefined);
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
      const activeGoal = await session.getThreadGoal();
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
    await session.setThreadGoal(objective);
    setDraft("");
    setSkills([]);
    setMentionResults([]);
    setComposerIntent("default");
    setCommandNotice("");
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
    if (await session.steer(message, mentions, skills, images)) {
      setDraft("");
      setMentions([]);
      setSkills([]);
      setImages([]);
      setMentionResults([]);
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

  function changePermissionMode(next: PermissionMode) {
    if (next === permissionMode) return;
    setPermissionMode(next);
    setCommandNotice("权限设置将在当前 Session 的下一条消息生效。");
  }

  function changeApprovalReviewer(next: ApprovalReviewerMode) {
    if (next === approvalReviewer) return;
    setApprovalReviewer(next);
    setCommandNotice(next === "auto_review"
      ? "自动风险审查将在下一条消息生效。"
      : "受保护操作将在下一条消息起由你审批。");
  }

  function changeProject(path: string | null) {
    if (session.thread) return;
    setWorkspaceExplorerOpen(false);
    setWorkspaceExplorerInitialPath(null);
    setMentions([]);
    setMentionResults([]);
    setPendingProjectPath(path);
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

  return {
    ...panels,
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
  };
}
