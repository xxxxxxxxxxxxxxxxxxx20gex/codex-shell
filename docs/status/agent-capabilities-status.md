# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：Skills 目录安装、Core 启停和可恢复卸载已接入；MCP 用户配置增删改、启停、stdio 参数及环境变量、HTTP Token 输入已接入；本地 Marketplace 添加/更新/移除和 Plugin 详情/安装/卸载已接入。
- 最近变更：扩展变更通知使 Plugins、Skills、MCP 重新读取，失效的 Composer Skill 选择会移除；不自动重启 Runtime。安装返回待认证 Connector 时明确提示未可用。MCP 支持 Escape 和外部点击关闭。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：新增或替换 MCP Token 需任务结束后手动重启 Runtime。配置与凭据写入不是跨系统事务，部分失败会明确报错。项目级 MCP 编辑、OpenAI 账户、官方远程目录和 Connector 登录不在此次范围。MCP 自身 OAuth 保留；命令面板未实现焦点陷阱。
- 下一步：人工验收真实第三方 MCP OAuth、Git Marketplace 下载及 Windows 凭据写入；持续验证 Runtime 兼容性。
- 验证证据：2026-09-09；隔离 Runtime 扩展探针通过；四尺寸三页面浏览器布局、文字下限、焦点、reduced-motion 检查通过。前端和 Debug 构建验证见 testing-release-status.md。
- 最后更新：2026-09-09
