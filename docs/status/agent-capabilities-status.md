# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标和计划能力映射为输入框 `/` 命令体验。
- 当前状态：`/skills`、`/mcp`、`/compact`、`/goal`、scoped experimental `/plan` 和原生 `/review` 已接入。
- 最近变更：运行中普通 Enter 使用 Shell 内存中的按 Session 有界 Queue，前一个 Turn 完成后再通过原生 `turn/start` 启动下一 Turn；Queue 不是 app-server 持久队列，显式 Steer 才调用原生 `turn/steer`。前端消费 `ThreadStatus.activeFlags`，只有有真实 Turn ID 的普通 Turn 才允许 Steer。历史 Resume 不再重复写入模型或权限，所有下一 Turn 设置在 `turn/start` 原子生效。
- 当前接口：`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`GoalPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：Shell Queue 仅存在当前应用进程内，重启不会恢复；尚无 Skills 安装和 MCP 配置编辑界面；命令面板尚未实现焦点陷阱。多 Skill、全局 AGENTS 和 Runtime Goal continuation 仍有上下文预算风险；本轮未注入任何自定义 system/developer prompt。
- 下一步：评估 Plugin/Apps 原生管理能否替代自建 Skills 安装；补齐 MCP 配置编辑和 Review 真实 Runtime smoke。
- 验证证据：协议与 DOM 测试覆盖 Review、排队与显式 Steer 分流、按 Session 队列隔离、完成后续发、中断后暂停、Review/Compact 不可 Steer、activeFlags 状态保持、同 Turn 中途用户消息原生顺序、MCP OAuth/资源请求、资源截断、安全 URL 和 Review 面板交互；既有 Plan/Skills/MCP/Goal smoke 继续有效。
- 最后更新：2026-08-13
