# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标和计划能力映射为输入框 `/` 命令体验。
- 当前状态：稳定 v2 的 `/skills`、`/mcp`、`/compact` 和 `/goal` 已接入；`/plan` 已通过 app-server 的 scoped experimental collaboration mode 接入真实 Plan 模式。
- 最近变更：`/plan` 可仅切换模式，也可用 `/plan <需求>` 直接发起规划 Turn；输入框显示 Plan 状态及退出入口。每个 Turn 都显式发送 `default` 或 `plan`，避免 app-server 的协作模式状态粘连到后续普通对话。
- 当前接口：`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`GoalPanel`、`useAgentCommands` 及 `AppServerClient` 对应稳定 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：尚无 Skills/MCP 安装与配置界面；命令面板尚未实现焦点陷阱和完整屏幕阅读器播报。
- 下一步：增加独立 CODEX_HOME 内的 Skills 安装、MCP 配置与认证流程，并跟踪 collaborationMode 的稳定化进度以移除局部实验类型。
- 验证证据：客户端测试精确验证 experimental 能力声明与 Plan collaborationMode 线格式；真实固定 Runtime Plan smoke 完成，收到 192 条 `item/plan/delta` 和 2 条 Plan item 通知。既有 Skills/MCP/Goal smoke 继续有效。
- 最后更新：2026-08-10
