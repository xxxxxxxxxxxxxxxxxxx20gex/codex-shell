# 项目总状态

- 当前阶段：Milestone 2 — P0 桌面编程工作台
- 总体状态：工作区、执行时间线、实时 Diff、多 Session 并行与稳定智能体命令已完成
- 最后更新：2026-08-07

## 已完成

- 已创建独立 Tauri 2 + React + TypeScript 项目，不修改 Codex Core。
- 已固定 `codex-cli 0.146.0-alpha.9.2` Runtime，并由同一二进制生成稳定 app-server v2 类型。
- 已接通 `initialize → thread/start/resume/list → turn/start → item 通知 → turn/completed`。
- 已将会话状态建模为可增量合并的 `Thread → Turn → Item`，支持多轮发送、历史加载和失败状态。
- 已实现左侧最近 50 个非临时本地线程、线程切换与重启恢复。
- 已实现命令、文件修改、额外目录/网络权限的审批队列及三档权限模式。
- JSON-RPC 客户端已支持启动去重、30 秒请求超时、停止时拒绝 pending request、协议错误上报和可注入 transport。
- 已使用中性产品标识 `com.codexshell.desktop`，应用配置、凭据、CODEX_HOME、SQLite、sessions、缓存和默认工作区均与官方 Codex 隔离。
- 已修复历史来源过滤：独立 CODEX_HOME 内的 rollout 可能被 Runtime 标记为 `vscode`，历史查询不再硬编码 `appServer`。
- 已完成部署路径审计：项目源码不包含开发机仓库绝对路径；Runtime 按环境覆盖、可执行文件同目录 sidecar、PATH 动态解析并验证；构建脚本由 `$PSScriptRoot`、PATH/CARGO_HOME 拼接。
- 已为第三方网关定义独立 `codex_shell_gateway` provider，通过 `env_key` 从子进程环境读取 Windows Credential Manager 中的 Key，不再误用宿主 Codex 认证。
- 对话时间线已展示每轮发送时间、回答完成时间和回答耗时，生成过程中显示明确状态。
- 已消费稳定 v2 item/turn 通知，展示计划、推理、命令输出、文件变更、MCP、Web 搜索、图片与子智能体活动。
- 已用 `turn/diff/updated` 建立实时文件 Diff 面板，并从持久化 `fileChange` item 重建历史 Diff。
- 已接入系统目录选择器，新线程把用户工作区作为 `thread/start.cwd`；输入框通过稳定 `fuzzyFileSearch` 搜索，并以原生 `mention` 输入发送文件引用。
- 已完成游标分页、固定、重命名、单 Session 归档和永久删除。
- 已将运行态从全局锁改为按 Thread 跟踪：一个 Session 等待回答时仍可新建、打开和操作其他 Session，并可同时运行多个 Turn；左栏和顶部显示并行运行状态，停止操作只作用于当前 Session。
- 已增加从左侧展开的工作区文件浏览器：目录懒加载、已展开文件筛选、单击文本/图片预览、二进制提示和大文本截断；工作区浏览与“选择工作区”改为两个独立入口。
- 已增加 Codex 风格 `/` 命令菜单，接入稳定 `skills/list`、`mcpServerStatus/list`、`thread/compact/start` 和 `thread/goal/*`；Skill 作为原生输入发送，MCP/Goal 使用面板管理。
- 已消费 `thread/tokenUsage/updated`，在对话框左侧显示当前上下文蓝红热力条；悬停区分当前上下文与 Session 累计 Token，点击复用 `thread/compact/start`，自动压缩阈值仍完全由 Codex Core 根据模型元数据动态决定。
- 已完成全项目代码健康审查：保留完整生成协议，删除未使用客户端包装、返回字段和 Runtime 来源标签，统一压缩及发送收尾流程，收窄多余导出并合并重复 CSS；严格 TypeScript、Knip 与 Rust Clippy 均通过。
- 已识别 `/plan` 的真实实现依赖实验性 collaborationMode，遵守稳定 v2 边界暂不启用，同时保留稳定计划通知展示。

## 当前数据流

`React 工作台 → TypeScript JSON-RPC 客户端 → Tauri command/event → 独立 CODEX_HOME 中的 codex app-server → 用户配置的 OpenAI 兼容接口`。

## 当前风险

- 断线自动恢复、超大 Diff 截断和二进制文件变更提示尚未完成。
- Runtime 自动获取、安装包、签名和干净 Windows 环境验证尚未完成。

## 下一里程碑

建立 Runtime 获取、断线恢复及 Windows 安装包验证流程，并继续接入 Review、Skills 安装与 MCP 配置管理。

## 验证证据

- `pnpm typecheck`：通过。
- `pnpm test`：10 个测试文件、41 项测试全部通过，包含并行 Thread、Token 用量、文件预览、slash 解析、原生 Skill 输入和稳定命令 RPC 覆盖。
- Rust 单元测试：4 项全部通过，覆盖动态 Runtime 路径和独立 provider 参数。
- `pnpm rust:check`：从 clean target 完整重编译后通过。
- `pnpm build`：包含目录选择插件和 P0 工作台 UI 的生产构建通过。
- Tauri debug build：从项目目录之外调用脚本成功，证明脚本不依赖调用者 cwd。
- 后台 app-server smoke：创建两个真实 turn、停止并重启 app-server、`thread/list` 找到线程、`thread/resume` 恢复 2 个 turn，独立 CODEX_HOME 通过断言。
- 后台并行 smoke：同一 app-server 中启动两个独立 Thread/Turn，观测到最大并发数 2 且两个 Turn 均完成；使用临时独立 CODEX_HOME，测试后自动清理。
- 后台文件 smoke：真实 `fs/readDirectory` 能列出临时工作区文件，`fs/readFile` 返回内容与源文件一致；临时目录测试后自动清理。
- 后台命令 smoke：真实 `skills/list`、`mcpServerStatus/list` 及 Goal set/get/clear 生命周期通过；Windows 句柄释放后临时目录已清理。
- 新网关验证：`/models` 返回 21 个模型，配置模型存在，`/responses` 状态为 completed；使用独立 provider 的真实 app-server turn 完成，并将验证后的凭据同步到 Windows Credential Manager。
