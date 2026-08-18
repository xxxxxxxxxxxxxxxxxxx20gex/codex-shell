# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：`/skills`、`/mcp`、`/compact`、`/goal`、scoped experimental `/plan` 和原生 `/review` 已接入。
- 最近变更：新增显式个性化提示词设置；非空内容只通过 app-server 原生 `thread/start.developerInstructions` 注入新建 Session，不拼入用户消息、不修改历史 Session，空设置不会产生额外提示词。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：Shell Queue 仅存在当前应用进程内，重启不会恢复；尚无 Skills 安装和 MCP 配置编辑界面；命令面板尚未实现焦点陷阱。多 Skill、全局 AGENTS、个性化提示词和 Runtime Goal continuation 都会占用上下文预算；当前 Runtime 没有在 `turn/start` 更新 developer instructions 的稳定字段，因此设置变更只对新建 Session 生效。
- 下一步：评估 Plugin/Apps 原生管理能否替代自建 Skills 安装；补齐 MCP 配置编辑和 Review 真实 Runtime smoke。
- 验证证据：固定 Runtime 本地假网关探针确认 `thread/goal/set` 会依次发出 Goal 更新、Thread 状态和 `turn/started` 通知并请求 `/v1/responses`，因此 Shell 不额外补发重复 Turn；纯决策和 DOM 测试覆盖 Goal/Plan 互斥、单标签呈现、Goal 新 Thread 可选与运行中禁用。
- 最后更新：2026-08-18
