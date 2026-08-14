# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：`/skills`、`/mcp`、`/compact`、`/goal`、scoped experimental `/plan` 和原生 `/review` 已接入。
- 最近变更：Goal 与 Plan 已对齐 Codex 桌面端的 Composer 模式交互，不再弹出独立 Goal 编辑面板。两者使用一个互斥意图状态和底栏标签；进入 Plan 会通过原生 Goal RPC 清除当前活动目标，Goal 则在主输入框收集目标并由 `thread/goal/set` 自动启动持续执行。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：Shell Queue 仅存在当前应用进程内，重启不会恢复；尚无 Skills 安装和 MCP 配置编辑界面；命令面板尚未实现焦点陷阱。多 Skill、全局 AGENTS 和 Runtime Goal continuation 仍有上下文预算风险；Shell 不注入自定义 system/developer prompt。
- 下一步：评估 Plugin/Apps 原生管理能否替代自建 Skills 安装；补齐 MCP 配置编辑和 Review 真实 Runtime smoke。
- 验证证据：固定 Runtime 本地假网关探针确认 `thread/goal/set` 会依次发出 Goal 更新、Thread 状态和 `turn/started` 通知并请求 `/v1/responses`，因此 Shell 不额外补发重复 Turn；纯决策和 DOM 测试覆盖 Goal/Plan 互斥、单标签呈现、Goal 新 Thread 可选与运行中禁用。
- 最后更新：2026-08-14
