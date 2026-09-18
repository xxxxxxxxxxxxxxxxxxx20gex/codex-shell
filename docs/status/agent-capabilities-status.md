# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 当前状态：内置目录只收录 CS 适配内容。Skill 目录提供兔子生图 `image-gen` 和只说明 Codex Shell 当前实现的 `cs-docs`；插件目录提供可选的 `CS Office`，安装后通过 Core 原生插件机制加载 `cs-office:cs-pdf`、`cs-office:cs-documents` 和 `cs-office:cs-spreadsheets`。用户本地 Skill 安装、Core 启停和可恢复卸载、MCP 配置与 OAuth 保留。插件页不展示官方远程候选项，已安装项保留详情及卸载。
- 插件详情：插件列表采用与 Skill 列表一致的整行点击进入详情，右侧只保留安装／卸载操作；插件详情使用独立紧凑样式，避免旧标题与首按钮样式覆盖；优先展示插件中文 interface 简介与长说明。CS Office 未安装时显示安装入口，不再展示绿色不可操作的开关；安装完成后保留详情并重新读取已安装 Skill 路径及状态，安装错误留在详情页供重试。已安装项使用蓝色圆形开关，通过 `skills/config/write` 写入并采用 `effectiveEnabled`；详情页打开和扩展变更后会重新读取 `skills/list` 的有效状态，与技能管理页保持一致。点击 Skill 打开独立正文滚动弹窗，通过 `fs/readFile` 读取（不执行 HTML、不加载图片或跳转链接），支持关闭、Escape、外部点击与焦点恢复；弹窗提供“在资源管理器中打开”，直接定位当前 Skill 的 `SKILL.md`。
- 最近变更：插件页收敛为单一固定列表，仅保留名称、简述、详情和安装／卸载动作；CS Office 安装前后保持首项，移除重复分类、认证摘要和成功提示。Skill 按 CS 内置、个人、系统分组；兔子生图和 CS Docs 按隔离 CODEX_HOME 下的实际路径识别，安装前后固定在内置组，CS Office Skill 按 pluginId 归入内置组。系统 `openai-docs` 在列表中标注为“OpenAI 官方文档”，并明确不代表 CS 当前实现。其他用户／插件技能归个人，系统、项目和管理员技能归系统并保留项目／管理员标签；搜索使用名称、展示名和描述。错误反馈与可恢复卸载不变。
- 草稿行为：选择草稿末尾的 `/skills` 等无参数快捷命令时只移除命令片段，保留正文、图片批注文字和附件；Escape 仅关闭斜杠菜单，不清空草稿。`+` 菜单继续保留全部输入。扩展变更刷新与失效 Skill 选择清理行为不变。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 是当前唯一启用的实验字段，只在 initialize 能力声明和 `turn/start` 客户端封装中最小扩展，不生成或暴露整套 experimental schema。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：`CS Office` 第一版不绑定完整办公运行时，依赖系统可用 Python 3 和相应格式包；LibreOffice、Poppler 缺失时只能完成结构验证，不能声称视觉验收。Google Workspace、Excel Add-in、实时 Excel 控制和官方模板选择器不在范围。新增或替换 MCP Token 仍需任务结束后手动重启 Runtime；命令面板未实现焦点陷阱。
- 下一步：在干净 Windows 环境评估为 `CS Office` 绑定可再分发 Python、LibreOffice 与 Poppler 的安装体积和维护成本；人工验收真实 PDF、DOCX、XLSX 任务以及第三方 MCP OAuth、Windows 凭据写入。
- 验证证据：2026-09-09；隔离 Runtime 扩展探针通过；四尺寸三页面浏览器布局、文字下限、焦点、reduced-motion 检查通过。前端和 Debug 构建验证见 testing-release-status.md。
- 定向验证：2026-09-14 控制器回归覆盖鼠标和 Enter 选择 `/skills` 后正文、批注、图片和文件保留，勾选 Skill 不改正文，Escape 保留输入，独立命令及 `+` 菜单行为；完整检查结果见测试与发布状态。本次未进行真实 API 对话验收。
- 最后更新：2026-09-18
- Skill 开关：Skills 三类列表、插件详情与内容弹窗共用滑动样式，仍由 Core 有效状态驱动。Skill 管理页和插件详情内的 Skill 二级详情共用同一套弹窗组件、工具栏和 Markdown 内容区域，资源管理器定位统一收纳在三点菜单中。技能列表的内容区域可进入 Skill 正文详情；详情顶部使用图标、轻量三点菜单和关闭按钮。操作区仍独立处理安装、卸载和启停。未安装插件的 Skill 固定显示关闭且禁用的灰色开关，并提示先安装，不把预览元数据中的 enabled 当成已启用。开关保留键盘语义、忙碌禁用和 reduced-motion 支持。
- 内置办公插件定向验证（2026-09-17）：插件及三个 Skill 结构校验通过；真实 codex-cli 0.154.0-alpha.6.2 app-server 在隔离临时 CODEX_HOME 中完成 `cs-curated` 添加、`cs-office` 安装、三个命名空间 Skill 发现、卸载和来源移除。未执行真实办公文件生成或干净机器依赖验收。
- 插件详情定向验证（2026-09-17 至 2026-09-18）：真实 Runtime 探针验证未注册市场的安装前详情、三个 Skill 路径与内容读取，以及安装后的禁用、重新读取和启用。组件测试覆盖预览无安装副作用、正文读取、有效开关状态、插件详情从 `skills/list` 同步关闭状态和读写失败；四视口浏览器验证详情、内容滚动、开关、关闭与焦点恢复。未进行真实 WebView2 人工点击验收。
- Skill 定向验证（2026-09-14）：`python -B tests/scripts/test_tuzi_skill.py` 的 5 项测试通过，覆盖变量配对、旧凭据不回读、URL 边界、缺配置不请求、默认及自选模型路由、CDN 不带密钥和输出不含测试 Key；请求使用 httpx MockTransport，未调用真实生图 API。`quick_validate.py` 用 Python UTF-8 模式通过；TypeScript、production build、Cargo check、39 项 Rust 测试、严格 Clippy 和 Debug 构建通过。

