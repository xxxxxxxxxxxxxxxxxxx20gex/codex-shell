# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：内置目录只收录 CS 适配内容，当前为随包提供的兔子生图 `image-gen` Skill，主动安装到隔离 CODEX_HOME 后默认关闭。暂无内置插件，办公套件未适配。用户本地 Skill 安装、Core 启停和可恢复卸载、MCP 配置与 OAuth 保留。插件页仅展示已安装项，保留详情及卸载。
- 最近变更：移除官方/第三方未安装插件目录、市场来源增删更新 UI 和 Installer 会话入口；保留已有插件管理及用户本地技能安装。删除无调用的 UI Hook 和会话编排逻辑；底层稳定协议及探针继续保留。过滤只影响展示，不清除用户来源、文件或配置。
- 草稿行为：选择草稿末尾的 `/skills` 等无参数快捷命令时只移除命令片段，保留正文、图片批注文字和附件；Escape 仅关闭斜杠菜单，不清空草稿。`+` 菜单继续保留全部输入。扩展变更刷新与失效 Skill 选择清理行为不变。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：新增或替换 MCP Token 需任务结束后手动重启 Runtime。配置与凭据写入不是跨系统事务，部分失败会明确报错。项目级 MCP 编辑、OpenAI 账户、官方远程目录和 Connector 登录不在此次范围。MCP 自身 OAuth 保留；命令面板未实现焦点陷阱。
- 下一步：适配并验证办公套件的依赖与再分发边界；人工验收第三方 MCP OAuth 及 Windows 凭据写入；持续验证 Runtime 兼容性。
- 验证证据：2026-09-09；隔离 Runtime 扩展探针通过；四尺寸三页面浏览器布局、文字下限、焦点、reduced-motion 检查通过。前端和 Debug 构建验证见 testing-release-status.md。
- 定向验证：2026-09-14 控制器回归覆盖鼠标和 Enter 选择 `/skills` 后正文、批注、图片和文件保留，勾选 Skill 不改正文，Escape 保留输入，独立命令及 `+` 菜单行为；完整检查结果见测试与发布状态。本次未进行真实 API 对话验收。
- 最后更新：2026-09-17
- 内置目录定向验证（2026-09-17）：未安装市场候选项隐藏、空目录、已安装插件卸载及失败保留回归通过；四视口技能/插件/MCP 页面布局、文字下限、键盘焦点及 reduced-motion 检查通过。未重跑真实 Runtime 扩展探针，未适配办公套件。
- Skill 定向验证（2026-09-14）：`python -B tests/scripts/test_tuzi_skill.py` 的 5 项测试通过，覆盖变量配对、旧凭据不回读、URL 边界、缺配置不请求、默认及自选模型路由、CDN 不带密钥和输出不含测试 Key；请求使用 httpx MockTransport，未调用真实生图 API。`quick_validate.py` 用 Python UTF-8 模式通过；TypeScript、production build、Cargo check、39 项 Rust 测试、严格 Clippy 和 Debug 构建通过。
