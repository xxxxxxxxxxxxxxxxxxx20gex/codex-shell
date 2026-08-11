# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标和计划能力映射为输入框 `/` 命令体验。
- 当前状态：`/skills`、`/mcp`、`/compact`、`/goal`、scoped experimental `/plan` 和原生 `/review` 已接入。
- 最近变更：`/review` 支持未提交修改、基础分支、Commit、自定义要求以及 inline/detached 输出，并保留 app-server 返回的合成审查 Turn。运行中的输入改用 `turn/steer`；MCP 面板补齐 OAuth、配置重载、工具/资源清单和最多 100000 字符的资源预览，外链只允许 HTTP(S)。
- 当前接口：`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`GoalPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：尚无 Skills 安装和 MCP 配置编辑界面；命令面板尚未实现焦点陷阱。多 Skill、全局 AGENTS 和 Runtime Goal continuation 仍有上下文预算风险；本轮未注入任何自定义 system/developer prompt。
- 下一步：评估 Plugin/Apps 原生管理能否替代自建 Skills 安装；补齐 MCP 配置编辑和 Review 真实 Runtime smoke。
- 验证证据：协议与 DOM 测试覆盖 Review、Steer、MCP OAuth/资源请求、资源截断、安全 URL 和 Review 面板交互；既有 Plan/Skills/MCP/Goal smoke 继续有效。
- 最后更新：2026-08-11
