# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：`/skills`、`/mcp`、`/compact`、`/goal`、scoped experimental `/plan` 和原生 `/review` 已接入。Skills 启停现在写入 app-server 配置；Runtime 客户端已具备本地 Marketplace/Plugin 管理和版本化 MCP 配置写入适配。
- 最近变更：Goal 状态消费 Core 的 `thread/goal/updated` 与 `thread/goal/cleared` 权威通知，打开已有 Session 时通过原生 `thread/goal/get` 补齐状态，Composer 会展示当前目标及 Core 状态并支持原生清除；目标模式提交现在在写入 Goal 后同时创建普通 Turn，因此用户输入会出现在当前对话时间线；Goal 的 set/get/clear RPC 和 Plan 互斥逻辑保持不变，不增加 Shell 自建循环。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：Shell Queue 仅存在当前应用进程内，重启不会恢复；Skill 独立安装/卸载和 MCP 配置表单尚未接入页面；Plugins 仍缺管理页面。插件远程目录和账户/Connector 认证没有承诺。命令面板尚未实现焦点陷阱。多 Skill、全局 AGENTS、个性化提示词和 Runtime Goal continuation 都会占用上下文预算；当前 Runtime 没有在 `turn/start` 更新 developer instructions 的稳定字段，因此设置变更只对新建 Session 生效。
- 下一步：接入受限的独立 Skill 文件安装/卸载命令；增加 MCP user-scope 表单和 Credential Manager 输入；增加 Local Marketplace/Plugin 管理页面。
- 验证证据：2026-09-09；`node tests/scripts/probe-extensions-runtime.mjs` 通过 Skills 持久化启停、MCP 版本化增删与 reload、本地 Marketplace/Plugin add/list/read/install/uninstall/remove；前端 `pnpm typecheck` 通过，Vitest 57 个文件/265 个测试通过；`cargo check --manifest-path src-tauri/Cargo.toml` 通过。
- 最后更新：2026-09-09
