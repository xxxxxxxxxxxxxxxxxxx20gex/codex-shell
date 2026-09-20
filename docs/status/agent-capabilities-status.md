# 智能体命令与扩展能力状态

- 模块职责：把 app-server 的 Skill、MCP、上下文压缩、目标、计划和 Review 映射为 Composer `+` 菜单与 `/` 快捷命令体验。
- 列表更新：Skills 和插件列表顶部不提供手动刷新按钮；进入页面、扩展 revision 变化及安装／卸载后仍自动读取列表，Skill 启停后重新读取有效状态。读取失败保留错误，可退出后重新进入页面重试。
- 当前状态：内置目录只收录 CS 适配内容。Skill 目录提供兔子生图 `image-gen`、高德地图 `amap` 和只说明 Codex Shell 当前实现的 `cs-docs`；插件目录提供可选的 `CS Office`，安装后通过 Core 原生插件机制加载 `cs-office:cs-pdf`、`cs-office:cs-documents` 和 `cs-office:cs-spreadsheets`。用户本地 Skill 安装、Core 启停和可恢复卸载、MCP 配置与 OAuth 保留。插件页不展示官方远程候选项，已安装项保留详情及卸载。
- 插件详情：插件列表整行点击进入详情，右侧保留安装／卸载。未安装时用 `plugin/read` 提供源目录预览；已安装时强制读取 `skills/list` 并按 `pluginId` 筛选，正文读取、资源管理器定位和 `skills/config/write` 全部使用实际安装路径，不使用市场源目录路径。初次加载或刷新失败时禁用开关，避免误写预览配置。写入采用 `effectiveEnabled` 并重新读取有效状态。内容弹窗支持关闭、Escape、外部点击与焦点恢复。
- 内置高德地图：`amap` 复用现有安装及可恢复卸载，按隔离 CODEX_HOME 的实际路径识别，安装前后固定在 CS 内置组，保留同名个人技能。包内使用 Bun 脚本、中文元数据和 Windows 示例；依赖外部 Bun 与 AMAP_MAPS_API_KEY，不包含用户密钥、不覆盖已有安装。CS 文档仍固定在系统组，实际 Core scope 不变。
- 最近变更：内置 Skill 文件安装成功后，即使默认关闭失败，也刷新安装状态并保留明确错误；Core 返回仍启用时提示有效状态，避免把安装成功误显示成未安装。列表读取错误与操作错误独立保留。高德请求的超时覆盖响应正文读取，永久 HTTP 错误不重试，暂时错误继续退避重试；所有请求路径释放计时器，对外错误不包含底层网络异常中的密钥 URL。已有高德安装不会自动覆盖，需重新安装才能使用包内修复。
- 草稿行为：选择草稿末尾的 `/skills` 等无参数快捷命令时只移除命令片段，保留正文、图片批注文字和附件；Escape 仅关闭斜杠菜单，不清空草稿。`+` 菜单继续保留全部输入。扩展变更刷新与失效 Skill 选择清理行为不变。
- 当前接口：`ComposerAddMenu`、`ComposerIntentControl`、`SlashCommandMenu`、`SkillPicker`、`McpStatusPanel`、`ReviewPanel`、`useAgentCommands` 及固定协议 RPC 包装。
- 能力边界：Plan 在 `turn/start` 客户端封装中使用局部适配；生成协议与兼容门禁包含实验类型，但不代表产品启用所有实验能力，具体策略与 Runtime 限制见 [协议状态](protocol-status.md)。Codex Core 从模型元数据动态决定自动压缩阈值：缺省为原始上下文窗口的 90%，模型或配置提供的更低值优先且不会超过 90%；Codex Shell 不设置、不复制也不触发该阈值，只展示 app-server 上报的实际用量。独立 CODEX_HOME 只会列出安装到 Codex Shell 环境的 Skills 和 MCP 配置，不自动读取官方 Codex 用户目录。
- 已知问题：`CS Office` 第一版不绑定完整办公运行时，依赖系统可用 Python 3 和相应格式包；LibreOffice、Poppler 缺失时只能完成结构验证，不能声称视觉验收。Google Workspace、Excel Add-in、实时 Excel 控制和官方模板选择器不在范围。新增或替换 MCP Token 仍需任务结束后手动重启 Runtime；命令面板未实现焦点陷阱。
- 下一步：在干净 Windows 环境评估为 `CS Office` 绑定可再分发 Python、LibreOffice 与 Poppler 的安装体积和维护成本；人工验收真实 PDF、DOCX、XLSX 任务以及第三方 MCP OAuth、Windows 凭据写入。
- 验证证据：2026-09-20 隔离扩展探针验证 Skills 持久化启停、MCP 配置增删、插件安装卸载、CS Office 实际安装路径及重启状态、高德发现与禁用；组件和四尺寸布局验证列表、详情、开关、焦点及关闭。草稿保留、安装部分成功和脚本错误边界有回归。生图脚本采用 MockTransport；真实外部 API、办公产物及干净机器依赖未验收。完整基线见 [测试与发布](testing-release-status.md)。
- 最后更新：2026-09-20
- Skill 开关：Skills 三类列表、插件详情与内容弹窗共用滑动样式，仍由 Core 有效状态驱动。Skill 管理页和插件详情内的 Skill 二级详情共用同一套弹窗组件、工具栏和 Markdown 内容区域，资源管理器定位统一收纳在三点菜单中。技能列表的内容区域可进入 Skill 正文详情；详情顶部使用图标、轻量三点菜单和关闭按钮。操作区仍独立处理安装、卸载和启停。未安装插件的 Skill 固定显示关闭且禁用的灰色开关，并提示先安装，不把预览元数据中的 enabled 当成已启用。开关保留键盘语义、忙碌禁用和 reduced-motion 支持。
