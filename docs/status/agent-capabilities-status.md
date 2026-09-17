# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：内置目录只收录 CS 适配内容。Skill 目录提供兔子生图 `image-gen`；插件目录提供可选的 `CS Office`，安装后通过 Core 原生插件机制加载 `cs-office:cs-pdf`、`cs-office:cs-documents` 和 `cs-office:cs-spreadsheets`。用户本地 Skill 安装、Core 启停和可恢复卸载、MCP 配置与 OAuth 保留。插件页不展示官方远程候选项，已安装项保留详情及卸载。
- 最近变更：新增随包的 `CS Office` 本地 marketplace、隔离 CODEX_HOME 物化命令和内置安装入口；插件添加、安装、发现与卸载继续调用 app-server 原生 RPC。三个原创 Skill 使用可再分发的 Python 生态依赖，不复制官方办公 Skill 或私有 `@oai/artifact-tool`。
- 草稿行为：选择草稿末尾的 `/skills` 等无参数快捷命令时只移除命令片段，保留正文、图片批注文字和附件；Escape 仅关闭斜杠菜单，不清空草稿。`+` 菜单继续保留全部输入。扩展变更刷新与失效 Skill 选择清理行为不变。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：`CS Office` 第一版不绑定完整办公运行时，依赖系统可用 Python 3 和相应格式包；LibreOffice、Poppler 缺失时只能完成结构验证，不能声称视觉验收。Google Workspace、Excel Add-in、实时 Excel 控制和官方模板选择器不在范围。新增或替换 MCP Token 仍需任务结束后手动重启 Runtime；命令面板未实现焦点陷阱。
- 下一步：在干净 Windows 环境评估为 `CS Office` 绑定可再分发 Python、LibreOffice 与 Poppler 的安装体积和维护成本；人工验收真实 PDF、DOCX、XLSX 任务以及第三方 MCP OAuth、Windows 凭据写入。
- 验证证据：2026-09-09；隔离 Runtime 扩展探针通过；四尺寸三页面浏览器布局、文字下限、焦点、reduced-motion 检查通过。前端和 Debug 构建验证见 testing-release-status.md。
- 定向验证：2026-09-14 控制器回归覆盖鼠标和 Enter 选择 `/skills` 后正文、批注、图片和文件保留，勾选 Skill 不改正文，Escape 保留输入，独立命令及 `+` 菜单行为；完整检查结果见测试与发布状态。本次未进行真实 API 对话验收。
- 最后更新：2026-09-17
- 内置办公插件定向验证（2026-09-17）：插件及三个 Skill 结构校验通过；真实 codex-cli 0.154.0-alpha.6.2 app-server 在隔离临时 CODEX_HOME 中完成 `cs-curated` 添加、`cs-office` 安装、三个命名空间 Skill 发现、卸载和来源移除。未执行真实办公文件生成或干净机器依赖验收。
- Skill 定向验证（2026-09-14）：`python -B tests/scripts/test_tuzi_skill.py` 的 5 项测试通过，覆盖变量配对、旧凭据不回读、URL 边界、缺配置不请求、默认及自选模型路由、CDN 不带密钥和输出不含测试 Key；请求使用 httpx MockTransport，未调用真实生图 API。`quick_validate.py` 用 Python UTF-8 模式通过；TypeScript、production build、Cargo check、39 项 Rust 测试、严格 Clippy 和 Debug 构建通过。
