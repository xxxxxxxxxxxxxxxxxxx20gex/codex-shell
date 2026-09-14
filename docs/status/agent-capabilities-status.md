# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：`image-gen` Skill 随安装包资源携带，在 CS 市场中由用户主动安装到独立 CODEX_HOME 的用户 Skill 目录，安装后默认关闭；Skills 目录安装、Core 启停和可恢复卸载已接入；MCP 用户配置增删改、启停、stdio 参数及环境变量、HTTP Token 输入已接入；本地 Marketplace 添加/更新/移除和 Plugin 详情/安装/卸载已接入。
- 最近变更：CS 市场兔子 `image-gen` 仅从 `CODEX_SHELL_IMAGE_API_KEY`、`CODEX_SHELL_IMAGE_BASE_URL` 成对读取生图配置，移除旧 `TUZI_API_KEY` 与本机凭据文档回退，不借用聊天 Key。缺配置时在请求前提示本机配置，URL 要求 HTTPS 且不带账号密码、查询参数或片段；模型仍由 `--model` 指定，默认改为当前维护的 `gpt-image-2.5`，不增加模型变量或自动追新。没有新增设置表单或凭据注入机制；环境变量需由用户配置并由 CS 继承。市场更新不覆盖已安装副本，需要用户备份自定义修改后卸载重装。Skill 不再依赖官方 Codex 的固定 Python 路径。
- 草稿行为：选择草稿末尾的 `/skills` 等无参数快捷命令时只移除命令片段，保留正文、图片批注文字和附件；Escape 仅关闭斜杠菜单，不清空草稿。`+` 菜单继续保留全部输入。扩展变更刷新与失效 Skill 选择清理行为不变。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：新增或替换 MCP Token 需任务结束后手动重启 Runtime。配置与凭据写入不是跨系统事务，部分失败会明确报错。项目级 MCP 编辑、OpenAI 账户、官方远程目录和 Connector 登录不在此次范围。MCP 自身 OAuth 保留；命令面板未实现焦点陷阱。
- 下一步：人工验收真实第三方 MCP OAuth、Git Marketplace 下载及 Windows 凭据写入；持续验证 Runtime 兼容性。
- 验证证据：2026-09-09；隔离 Runtime 扩展探针通过；四尺寸三页面浏览器布局、文字下限、焦点、reduced-motion 检查通过。前端和 Debug 构建验证见 testing-release-status.md。
- 定向验证：2026-09-14 控制器回归覆盖鼠标和 Enter 选择 `/skills` 后正文、批注、图片和文件保留，勾选 Skill 不改正文，Escape 保留输入，独立命令及 `+` 菜单行为；完整检查结果见测试与发布状态。本次未进行真实 API 对话验收。
- 最后更新：2026-09-14
- Skill 定向验证（2026-09-14）：`python -B tests/scripts/test_tuzi_skill.py` 的 5 项测试通过，覆盖变量配对、旧凭据不回读、URL 边界、缺配置不请求、默认及自选模型路由、CDN 不带密钥和输出不含测试 Key；请求使用 httpx MockTransport，未调用真实生图 API。`quick_validate.py` 用 Python UTF-8 模式通过；TypeScript、production build、Cargo check、39 项 Rust 测试、严格 Clippy 和 Debug 构建通过。
