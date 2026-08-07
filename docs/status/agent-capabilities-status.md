# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标和计划能力映射为输入框 `/` 命令体验。
- 当前状态：稳定 v2 的 `/skills`、`/mcp`、`/compact` 和 `/goal` 已接入；`/plan` 可见但明确标记为实验 API，不会在稳定模式下伪执行。
- 最近变更：新增 Codex 风格命令选择框与上下文热力条；Skill 通过 `skills/list` 读取并作为原生 `UserInput(type: "skill")` 附加；MCP 显示服务器、工具和认证状态；Goal 支持 get/set/clear；菜单和热力条的手动 Compact 均调用 `thread/compact/start`。
- 当前接口：`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`GoalPanel`、`useAgentCommands` 及 `AppServerClient` 对应稳定 RPC 包装。
- 能力边界：真正 Plan 模式依赖实验性 `turn/start.collaborationMode`，项目首版禁止启用 experimental API；稳定 `turn/plan/updated` 仍用于展示模型产生的计划。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：尚无 Skills/MCP 安装与配置界面；命令面板尚未实现焦点陷阱和完整屏幕阅读器播报。
- 下一步：增加独立 CODEX_HOME 内的 Skills 安装、MCP 配置与认证流程；待 collaborationMode 成为稳定 API 后再启用真正 `/plan`。
- 验证证据：slash parser、原生 Skill/File 输入构造、6 个稳定 RPC 包装测试，以及真实 app-server Skills/MCP 列表与 Goal 生命周期 smoke 通过。
- 最后更新：2026-08-07
