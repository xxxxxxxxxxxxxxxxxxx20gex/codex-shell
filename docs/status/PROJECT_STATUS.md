# 项目总状态

- 当前阶段：Milestone 2 — P0 桌面编程工作台
- 总体状态：工作区、执行时间线、实时 Diff、多 Session 并行与稳定智能体命令已完成
- 最后更新：2026-08-10

## 已完成

- 已创建独立 Tauri 2 + React + TypeScript 项目，不修改 Codex Core。
- 已固定 `codex-cli 0.146.0-alpha.9.2` Runtime，并由同一二进制生成稳定 app-server v2 类型。
- 已接通 `initialize → thread/start/resume/list → turn/start → item 通知 → turn/completed`。
- 已将会话状态建模为可增量合并的 `Thread → Turn → Item`，支持多轮发送、历史加载和失败状态。
- 已实现左侧最近 50 个非临时本地线程、线程切换与重启恢复。
- 已实现命令、文件修改、额外目录/网络权限的审批队列及三档权限模式。
- JSON-RPC 客户端已支持启动去重、30 秒请求超时、停止时拒绝 pending request、协议错误上报和可注入 transport。
- 已使用中性产品标识 `com.codexshell.desktop`；默认 CODEX_HOME 按官方 `~/.codex` 的命名规则落在 `~/.codex-shell`，支持自定义目录并禁止与官方目录重叠，应用配置、凭据、SQLite、sessions、缓存和默认工作区均与官方 Codex 隔离。
- 已修复历史来源过滤：独立 CODEX_HOME 内的 rollout 可能被 Runtime 标记为 `vscode`，历史查询不再硬编码 `appServer`。
- 已完成部署路径审计：项目源码不包含开发机仓库绝对路径；Runtime 按环境覆盖、可执行文件同目录 sidecar、PATH 动态解析并验证；构建脚本由 `$PSScriptRoot`、PATH/CARGO_HOME 拼接。
- 已为第三方网关定义独立 `codex_shell_gateway` provider，通过 `env_key` 从子进程环境读取 Windows Credential Manager 中的 Key，不再误用宿主 Codex 认证。
- 对话时间线已展示每轮发送时间、回答完成时间和回答耗时，生成过程中显示明确状态。
- 已压缩桌面纵向占用：移除无功能的应用品牌栏、会话标题栏和输入框底部提示，时间线显示区域扩大；模型入口统一为工具栏按钮，上下文热力条改为自下而上增长。
- 左右功能区均支持拖拽调整宽度和独立隐藏/恢复，中央对话区会自动占用释放的空间，并受最小可用宽度保护。
- 右侧状态区已删除重复的 app-server 与审批策略卡片；CODEX_HOME 卡片支持选择自定义目录和恢复默认目录，切换时安全重启 app-server。
- 已消费稳定 v2 item/turn 通知，展示计划、推理、命令输出、文件变更、MCP、Web 搜索、图片与子智能体活动。
- 已用 `turn/diff/updated` 建立实时文件 Diff 面板，并从持久化 `fileChange` item 重建历史 Diff。
- 已接入系统目录选择器，新线程把用户工作区作为 `thread/start.cwd`；输入框通过稳定 `fuzzyFileSearch` 搜索，并以原生 `mention` 输入发送文件引用。
- 已完成游标分页、固定、重命名、单 Session 归档和永久删除。
- 左侧 Session 增加随当前列表动态重排的展示编号，中央区同步显示当前 Session 编号与名称；所有打开、修改与删除仍只使用真实 Thread ID，展示编号不进入路由。
- 每个 Session 可复制 rollout 路径供其他智能体读取，路径缺失时回退真实 Thread ID；操作按钮统一使用居中 SVG 与 0.3 秒延迟说明。
- 已将运行态从全局锁改为按 Thread 跟踪：一个 Session 等待回答时仍可新建、打开和操作其他 Session，并可同时运行多个 Turn；左栏和顶部显示并行运行状态，停止操作只作用于当前 Session。
- 已增加从左侧展开的工作区文件浏览器：目录懒加载、已展开文件筛选、单击文本/图片预览、二进制提示和大文本截断；工作区浏览与“选择工作区”改为两个独立入口。
- 已增加 Codex 风格 `/` 命令菜单，接入稳定 `skills/list`、`mcpServerStatus/list`、`thread/compact/start` 和 `thread/goal/*`；Skill 作为原生输入发送，MCP/Goal 使用面板管理。
- 已消费 `thread/tokenUsage/updated`，在对话框左侧显示当前上下文蓝红热力条；悬停区分当前上下文与 Session 累计 Token，点击复用 `thread/compact/start`，自动压缩阈值仍完全由 Codex Core 根据模型元数据动态决定。
- 已完成全项目代码健康审查：保留完整生成协议，删除未使用客户端包装、返回字段和 Runtime 来源标签，统一压缩及发送收尾流程，收窄多余导出并合并重复 CSS；严格 TypeScript、Knip 与 Rust Clippy 均通过。
- 已通过最小 scoped experimental 适配启用真实 `/plan`：initialize 声明能力，只有 Plan Turn 附加 collaboration mode，默认 Turn 保持稳定请求结构，不生成或暴露整套实验 schema。
- 已将 Session 前端状态限制为最近 200 个 Turn，Diff 与 Plan 映射随裁剪同步释放；移除旧状态栏删除后遗留的 React 连接状态镜像。
- 已加固 CODEX_HOME 升级迁移：空的新默认目录仍迁移旧历史，双非空目录无损拒绝，默认真实路径同样禁止绕回官方 `.codex`。
- 已把 app-server 原生 Item 生命周期接入对话窗口：实时显示当前分析、命令、文件、MCP、工具和子智能体活动；Plan delta 与 MCP progress 流式更新，未引入轮询或自定义提示词。
- 已对齐官方桌面壳的默认工作区方式：使用系统文档目录下独立的 `Codex-Shell/YYYY-MM-DD` 每日目录；左侧只展示用户选择的项目，默认路径集中到右侧状态区。
- 归档和永久删除 Session 均增加产品内二次确认窗口，清楚说明可恢复性差异，并提供安全取消焦点、Escape 与遮罩关闭。
- 已确认原版 app-server 在隔离 CODEX_HOME 中原生记录 SQLite tracing 日志和 rollout 事件；一次 33.5 秒回合中壳层与 app-server 提交开销不足 1 秒，约 28 秒消耗在网关首个可见增量等待，后续回合另出现上游 overloaded 与 Core 原生重试。
- 已消费 Tauri `app-server://log`：右侧新增实时日志页，使用 200 条/单行 4000 字符硬上限和 150ms 批量刷新控制内存及渲染开销，并标注日志的敏感数据属性。

## 当前数据流

`React 工作台 → TypeScript JSON-RPC 客户端 → Tauri command/event → 独立 CODEX_HOME 中的 codex app-server → 用户配置的 OpenAI 兼容接口`。

## 当前风险

- app-server 崩溃后的当前 Session 自动恢复、超大文件预览/超大 Diff 的源端截断和二进制文件变更提示尚未完成。
- 旧 CODEX_HOME 的跨卷迁移仍需可恢复复制方案；当前同卷迁移和双目录冲突已按保数据原则处理。
- Runtime 自动获取、安装包、签名和干净 Windows 环境验证尚未完成。
- 实时 stderr 只保留当前窗口最近 200 条，不提供跨启动查询；长期诊断仍需直接读取 Core 的 `logs_2.sqlite`，尚未提供脱敏导出流程。

## 下一里程碑

建立 Runtime 获取、断线恢复及 Windows 安装包验证流程，并继续接入 Review、Skills 安装与 MCP 配置管理。

## 验证证据

- `pnpm typecheck`：通过。
- `pnpm test`：17 个测试文件、67 项测试全部通过，包含 app-server stderr 订阅/释放与有界缓冲、Session 归档/永久删除二次确认、每日默认工作区、动态编号与引用、Plan/默认 Turn 协议、原生 Item 中间态、200 Turn 有界状态、三栏尺寸边界、并行 Thread、Token 用量、文件预览、slash 解析、原生 Skill 输入和稳定命令 RPC 覆盖。
- Rust 单元测试：9 项全部通过，覆盖动态 Runtime、每日默认工作区、独立 provider 参数、旧 CODEX_HOME 迁移、双目录冲突和官方目录防重叠校验。
- `pnpm rust:check`：从 clean target 完整重编译后通过。
- `pnpm build`：包含目录选择插件和 P0 工作台 UI 的生产构建通过。
- Tauri debug build：从项目目录之外调用脚本成功，证明脚本不依赖调用者 cwd。
- 后台 app-server smoke：创建两个真实 turn、停止并重启 app-server、`thread/list` 找到线程、`thread/resume` 恢复 2 个 turn，独立 CODEX_HOME 通过断言。
- 后台并行 smoke：同一 app-server 中启动两个独立 Thread/Turn，观测到最大并发数 2 且两个 Turn 均完成；使用临时独立 CODEX_HOME，测试后自动清理。
- 后台文件 smoke：真实 `fs/readDirectory` 能列出临时工作区文件，`fs/readFile` 返回内容与源文件一致；临时目录测试后自动清理。
- 后台命令 smoke：真实 `skills/list`、`mcpServerStatus/list` 及 Goal set/get/clear 生命周期通过；Windows 句柄释放后临时目录已清理。
- 后台 Plan smoke：固定 Runtime 完成真实 Plan Turn，收到 192 条 plan delta 与 2 条 Plan item 通知；临时独立 CODEX_HOME 已清理。
- 新网关验证：`/models` 返回 21 个模型，配置模型存在，`/responses` 状态为 completed；使用独立 provider 的真实 app-server turn 完成，并将验证后的凭据同步到 Windows Credential Manager。
