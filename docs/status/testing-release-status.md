# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界；模块行为由对应状态文档维护，历史由 Git 保留。
- 当前状态：v0.1.13 使用官方 Core 0.160.1，沿用既有 Updater minisign 公钥，分发 NSIS 安装器、签名与带中文更新说明的更新元数据。当前客户端检查更新后直接下载安装，不展示更新正文。Windows Authenticode 尚未配置，SmartScreen 仍可能提示未知发布者。
- 当前接口：`pnpm test:quality` 执行 TypeScript、ESLint、Vitest、高德离线测试、production build、Knip、Cargo check、Rust 单测、严格 Clippy 和 diff 检查。专项入口见 [测试脚本说明](../../tests/scripts/README.md)。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；`package.json` 遗留的 `test:extension-layout` 指向不存在的脚本，MCP 管理可使用现有 `test:mcp-layout`（不等价于全部扩展管理验证），不能把失效入口作为验证证据；Vite 主 chunk 超过 500 kB；Rust 既有格式差异尚未整理，`cargo fmt --check` 未纳入门禁。
- 下一步：真实系统凭据、多渠道对话、第三方 MCP OAuth、干净 Windows 安装升级和大型历史迁移验收。
- 最后更新：2026-10-23

## 当前验证基线

2026-10-23 任务栏图标修复：旧 Debug 窗口通过 Win32 复现 `ICON_BIG` 缺失；新 Debug 在显示前加载 EXE 图标资源。新增 `check-window-icon.ps1`，读取真实窗口大小图标，按运行窗口的图标尺寸与 EXE 资源逐像素比对并导出 PNG；Windows PowerShell 5 与 PowerShell 7 均通过，本机 150% DPI 下任务栏大图标为 48×48，已复核真实任务栏截图。TypeScript、Cargo check、52 项 Rust 测试（1 项忽略）、严格 Clippy、四尺寸工作台、production build 和 Debug 构建通过。未覆盖干净安装或固定快捷方式缓存，未重跑前端全量单测，保留既有构建提示。

2026-10-23 侧栏新建对话配色：使用共享中性抬升底色／主文字，悬停和焦点使用选中底色。四尺寸工作台探针通过；独立浏览器探针验证浅色、深色和系统暗色的静止／悬停计算颜色、键盘焦点和尺寸稳定，已复核暗色窄窗口。TypeScript、Cargo check、production build 与 Debug 构建通过。探针初次在过渡未完成时读取颜色失败，改为等待目标计算样式后通过；未进行真实 WebView2 人工验收，未重跑全量单测。

2026-10-23 双小狗形象校正：从适配参考插画提取约 73KB SVG 轮廓，替换几何重绘，保留原有脸型、长耳、抱爪姿态和毛边；两个角色分别小幅起伏／摆动，草叶连续平移。四尺寸深浅主题探针验证两种 motion 设置均播放且布局稳定；独立 SVG 浏览器检查确认姿态随时间变化、1.6 秒周期首尾截图完全一致，复核浅深背景放大图与暗色窄窗口。TypeScript、ESLint、Cargo check、production build 和 Debug 构建通过。未重跑全量单测，未进行真实 WebView2 人工验收；当前未实现原视频逐帧抬爪，保留既有构建提示。

2026-10-23 C 版图标替换：用户选定淡紫底／紫色对称代码符号；生成原图去除外围白底后作为 PNG 母版，标题栏与 Tauri 派生平台图标同步使用，移除旧字母 SVG。检查 756×756 母版透明角落、128px 外观与 ICO 的 16/24/32/48/64/256px 子图。TypeScript、3 项标题栏测试、四尺寸工作台探针、Cargo check、production build 和 Debug 构建通过。未重跑全量单测，未验证真实 Windows 图标缓存刷新或 WebView2 人工验收；保留既有构建警告。

2026-10-23 主题校正：浅色按批准稿的实际纸面取色，补新建对话主动作、淡化输入框聚焦边线和代码标题栏层次，暗色及系统暗色恢复中性黑灰；主题预览缩小且保持对应配色。487 项前端测试、TypeScript、ESLint、Knip、production build、Cargo check、52 项 Rust 测试（1 项忽略）、严格 Clippy 和 Debug 构建通过；复跑四尺寸 `soft-notebook`、`workbench`、`composer`、`markdown-code` 探针。新增暗色中性约束和系统配色检查，深浅文字对比度通过。工作台截图等待主题文字计算样式完成后采集，避免切换瞬间旧色被截图；已复核深浅截图。未验证真实 WebView2，保留既有 Vite 大 chunk 警告。

2026-10-23 Soft Notebook UI：487 项前端测试、TypeScript、ESLint、Knip、production build、Cargo check、52 项 Rust 单测（1 项交互用例忽略）、严格 Clippy 与 Debug 构建通过。新增默认浅色/既有主题保留回归。四尺寸 `workbench`、`composer`、`channel`、`mcp`、`async-question`、`image-annotation`、`markdown-code` 与 `soft-notebook` 浏览器探针通过；后者验证技能/详情、斜杠菜单、设置、空状态、Portal、系统主题切换和文字对比度。代码块头部探针按新契约从 44px 调整为 32px。最初对比度检查发现两项浅色选中态低于 4.5:1，已加深文字并复测通过。浏览器数据为 fixture，不覆盖真实系统凭据、在线模型调用或真实 WebView2；未生成或发布安装器。Vite 既有主 chunk 大小警告保留。

2026-10-23 项目文档 Skill 同步：格式校验、代码原则源内容比对、三个 Debug 资源哈希比对、3 项内置资源测试、TypeScript、Cargo check、production build 与 Debug 构建通过。系统 Python 别名未执行校验，改用本机 Conda Python 后校验通过。仅更新技能与说明，未改应用代码，未重跑全量前端／Rust 测试、Clippy 或真实模型任务；公开版本仍为 v0.1.13。

2026-10-20 v0.1.13：78 文件／487 项前端、34 项高德离线、51 项 Rust 测试通过（1 项交互测试忽略），TypeScript、ESLint、Knip、Cargo check、lib 严格 Clippy、production build、Debug 和生产安装器构建通过。真实 Core 协议探针、同源兼容门禁、release 内置 rg 探针通过；资源区四尺寸 Edge 使用模拟文件与回调验证统一附件、PDF／表格／Markdown、折叠过程文件、点击与焦点，不代表真实 WebView2 人工验收。首次附件断言因同名文件名／路径匹配多个元素失败，限定文件名元素后全量通过。安装器及可信注释签名、更新地址和 Runtime/helper 哈希校验通过；SHA-256 `9428b1fb7c0094f35ace92cd374253095808f716c64fe0615dea1b9b9a40df60`。未执行干净 Windows 安装／真实网络升级，仍有既有 Vite 大 chunk 和链接器信息提示。

2026-10-20 导航遮挡修复：78 文件／486 项前端测试、TypeScript、ESLint、Knip、Cargo check、production build、Debug 构建及 Runtime 哈希校验通过。输入框／时间线探针改为扣除左右栏宽度，四尺寸验证 320px 输入框下导航未被覆盖，并实际点击返回最新；此前全宽夹具不能证明工作台窄列可点击。未改 Rust，未重跑 Rust 单测／Clippy，未进行真实 WebView2 人工验收。

2026-10-20 输入框布局修复：78 文件／486 项前端测试、TypeScript、ESLint、Knip、Cargo check、production build、Debug 构建及 Runtime 哈希校验通过。新增 `test:composer-timeline-layout` 与原 `test:composer-layout` 均通过四尺寸 Edge 验证，覆盖轨道／导航固定、最新消息避让、历史阅读位置、键盘与 Escape、输入区边界和 reduced-motion；新探针先发现减少动态效果模式下占位过渡导致贴底丢失，禁用该占位过渡后复跑通过。未修改 Rust；未重跑 Rust 单测／Clippy，未进行真实 WebView2 人工验收。

2026-10-20 历史拖动排序：78 文件／486 项前端测试、TypeScript、ESLint、Knip、Cargo check、production build（Debug 构建内运行）、Debug 构建与 Core 0.160.1 哈希校验通过。新增 `test:history-order-layout` 四尺寸 Edge 检查覆盖指针拖动、插入线、持久化、置顶边界、取消、不误打开、键盘与菜单、边缘滚动及长标题；使用模拟会话，不访问真实历史。Knip 首次发现新探针未注册，补 package 入口后通过。未改 Rust，未重跑 Rust 单测／Clippy；未执行真实 WebView2 人工验收，仍有既有 Vite 大 chunk 提示。

2026-10-20 正文资源链接：77 文件／480 项前端测试、TypeScript、ESLint、Knip、production build、Cargo check、Debug 构建及 Core 0.160.1 哈希校验通过。新增本地图片文字跳转、引用图片、外层链接无嵌套、远程打开、非法协议及失败提示覆盖；原时间线测试对 class 完整字符串的两处断言改为类名匹配后全量复跑通过。Edge 四尺寸深浅主题验证蓝色 Token、16px 图标、键盘焦点与 Enter、长标签换行、无正文 img，以及 Escape／外部点击和 reduced-motion；使用真实 Markdown 组件与模拟打开回调，未执行完整 WebView2 文件打开验收。未修改 Rust，未重跑 Rust 单测／Clippy。

2026-10-14 引导消息即时反馈：477 项前端测试通过，新增覆盖已有用户消息时立即追加、相同文本按客户端 ID 区分、确认去重、完整／摘要完成快照、迟到确认与失败、跨会话隔离、RPC 未完成即派发及等待状态展示。真实 Core 0.160.1＋隔离本机模拟网关验证 steer 客户端 ID 在事件和历史中一致；Edge 四尺寸验证等待提示、复制焦点、禁止占位编辑与 Escape／外部点击保持显示。TypeScript 初次发现测试夹具缺少时间字段、错误的 itemsView 值及目标库不支持 `.at`，修正后通过；49 项受影响测试复跑通过。ESLint、Knip、production build、Cargo check、Debug 构建与 Runtime 哈希校验通过；最终提示样式调整后另复跑 23 项时间线测试与四尺寸检查。未修改 Rust，未重跑 Rust 单测／Clippy；未运行真实收费模型或完整 WebView2 人工验收。

2026-10-12 可选内置项目文档 Skill：77 文件／470 项前端测试、TypeScript、ESLint、Knip、production build、Cargo check、51 项 Rust 测试（1 项交互测试忽略）、严格 Clippy、Debug 构建与 Core 0.160.1 哈希校验通过。新 Skill 的格式及打包资源哈希验证通过；格式校验首次受 Windows GBK 默认编码影响失败，指定 UTF-8 后通过。Edge 四尺寸挂载真实管理组件，模拟安装 IPC，验证默认关闭、详情关闭和布局。未重跑高德／生图专项，未执行真实模型文档任务、干净 Windows 安装或生产发布；不替换上一版完整发布基线。

2026-10-12 更新网络提示（v0.1.12 发布后的 main）：15 项设置组件测试、TypeScript、ESLint、production build、Cargo check、Debug 构建及 Runtime 哈希校验通过。覆盖字符串／Error 网络故障、下载失败、非网络错误原文保留和重试清理；真实 RuntimePreferences 组件在 Edge 四尺寸显示长提示无溢出，IPC 网络错误为模拟注入。未做真实断网升级安装，未重跑全量测试或 Rust 单测。

v0.1.12 生产资产：NSIS 安装器、`.sig` 和带中文更新说明的 `latest.json` 已生成；独立 Ed25519／BLAKE2b 验签、可信注释签名、版本／下载地址／manifest 签名一致性与 release Runtime／辅助程序哈希校验通过。安装器 SHA-256：`363182bd1c5d7b258f49160892ac569778551afee92c83acf9785fd1f19bfa5e`。

2026-10-12 v0.1.12 发布验收：版本同步后复跑 459 项前端、34 项高德离线、51 项 Rust 测试（1 项交互测试忽略）、TypeScript、ESLint、Knip 和严格 Clippy 均通过；生产前端及 Debug 构建通过，Core 0.160.1 同源门禁及哈希校验通过。原生协议、异步问答、冷恢复、连续侧聊使用真实 Core 与本机模拟网关；release 输出内置 rg 探针通过（首次误传可执行文件而非目录造成 ENOENT，纠正参数后通过）。未验证真实收费渠道、干净 Windows 安装或完整 WebView2。更新说明同时写入 GitHub Release 和 `latest.json`。

2026-10-12 侧聊提交边界补充：76 文件／459 项前端测试、TypeScript、ESLint、Knip、production build、Cargo check、Debug 构建及同源 Runtime 哈希校验通过。新增 7 项测试覆盖完成／失败／中断通知先于提交响应（同批处理）、下一轮正常发送，以及未改动／改动／改回原文／失败后的草稿保留。真实 Core 隔离模拟网关连续两轮探针、共享问答卡片四尺寸深浅主题检查复跑通过。时序竞态由模拟测试验证，不代表真实渠道发生频率；未重跑 Rust 单测／Clippy 和高德测试，未做完整 WebView2 人工验收。

2026-10-12 侧聊生命周期修复：76 文件／452 项前端测试、TypeScript、ESLint、Knip、production build、Cargo check 和 Debug 构建通过，Core 0.160.1 及辅助程序哈希校验通过。真实 Core 历史升级探针增加临时侧聊连续两轮验证，使用隔离目录与本机模拟 Responses 网关；卡片 Edge 四尺寸深浅主题检查通过（共享问答组件，非完整侧聊桌面端）。本次未修改 Rust，未重跑 Rust 单测／Clippy 或高德测试；未验收真实收费渠道与完整 WebView2。

2026-10-10 v0.1.11 发布验收：442 项前端测试、34 项高德离线测试、51 项 Rust 测试（1 项交互测试忽略）、TypeScript、ESLint、Knip、Cargo check、严格 Clippy、前端及 Debug 构建通过。`test:quality` 首轮在未注册探针入口处停止，注册后 Knip 通过；Rust 独立临时 target 因 serde 生成文件缺失失败，默认 target 的 check／test／Clippy 全部复跑通过。问答和工作台 Edge 四尺寸检查通过，问答包含深浅主题；Vite 未启动导致的一次布局超时在服务启动后复跑通过。新增真实 Core 问答探针覆盖结构化问题事件、回答封装到达本机网关、冷恢复问题／答复、运行中 steer 接收；既有协议、历史恢复及 release 输出的内置 rg 探针通过。均使用隔离数据与模拟网关，不代表真实收费渠道或完整 WebView2 端到端验收。

2026-10-10 异步问答审查修复：全量 Vitest 76 文件／442 项、TypeScript、ESLint、Knip、production build、默认 target 的 Cargo check、Debug 构建及 Runtime／辅助程序哈希验证通过。41 项定向时间线测试中新增覆盖选项题自定义答案、同名问题 ID 区分、发送期间重复点击与冻结、false／异常失败后重试、UTF-8 封装上限、只读与未完成表单、Core 确认历史恢复和乐观输入排除。`check-async-question-layout.mjs` 在四尺寸深浅主题挂载真实卡片，检查自由输入、焦点、Escape／外部点击保留草稿、发送中锁定与完成状态，截图已复核；此为模拟发送回调，不等于真实网关或 WebView2 端到端验证。未修改 Rust，未重跑 Rust 单测／Clippy；不更新完整跨语言质量基线。

2026-10-10 提问面板视觉调整：34 项时间线定向测试、TypeScript、ESLint、前端构建、Debug 及 Runtime 哈希检查通过；Cargo check 首次因运行中 Debug 的文件占用失败，构建脚本解除项目进程占用后复跑通过。Edge 四尺寸深浅主题检查覆盖选中、焦点、发送后只读、边界与 reduced-motion；本次未重跑全量测试，未人工验收 WebView2。

2026-10-10 异步问答初版的 34 项测试只覆盖渲染、选项与无选项输入及一次成功提交；原记录中的重复提交和输入上限覆盖不成立。审查修复后的证据见下述专项。

2026-10-09 历史行空白列修复专项：10 项历史列表测试、TypeScript、ESLint、production build、Cargo check、51 项 Rust 测试（1 项忽略）与 Clippy 通过。四尺寸 Edge 探针覆盖隐藏操作不占标题列、hover／键盘聚焦让位、移出后宽度恢复、行高稳定和省略号；深浅主题截图已生成。探针挂载真实历史列表组件，不代表用户机器上的完整 WebView2 验收。

2026-10-09 用户消息操作尺寸专项：工作台四尺寸 Edge 探针验证 24px 点击区、14px 图标、无悬停描边与键盘焦点；TypeScript、production build、Cargo check、51 项 Rust 测试（1 项忽略）与 Clippy 通过。探针使用用户消息结构夹具，不代表完整 WebView2 人工验收。

2026-10-09 MCP 启动提示专项：14 项通知存储／协议订阅测试、TypeScript、ESLint、production build、Cargo check、51 项 Rust 测试（1 项忽略）和 Clippy 通过。覆盖重复就绪静默、失败按服务器／会话隔离、恢复清理及重复可见失败不延长计时；未连接用户的真实 MCP 服务。

2026-10-09 表格复制专项：9 项 Markdown 组件测试、TypeScript、ESLint、四尺寸 Edge 代码块／表格探针及 Rust 检查通过（51 项通过、1 项忽略）。探针模拟剪贴板验证 TSV 内容，未进行 Excel 人工粘贴验收。

2026-10-08，工作台 UI 一致性调整后：74 个文件／427 项 Vitest、TypeScript、ESLint、Knip、Cargo check、production build 与 Debug 构建通过，Core 0.160.1 主程序及所有辅助程序哈希校验通过。工作台、Composer、代码块、文件菜单、渠道、MCP、草图、终端交互八组 Edge 探针均覆盖 1440×900、1280×780、1024×720、900×700。新增工作台探针使用真实子组件与模拟工作台壳，覆盖深浅主题、历史行 hover 几何稳定、列对齐及添加／权限／历史菜单键盘和关闭交互；不覆盖完整 App、全部菜单或真实 Runtime。reduced-motion 下的计算样式断言由 Composer 探针提供，工作台探针仅截图；宽窄截图已复核。文件菜单探针的 Markdown 资源断言已按既有文档预览行为修正。真实 WebView2 人工验收未完成。本次未改 Rust 实现，Rust 单测／Clippy 和高德测试沿用下述前一基线，未重跑。

继承的专项基线：2026-10-08 UI 调整前，34 项高德离线测试、51 项 Rust 单测（1 项交互测试忽略）及严格 Clippy 通过。UI 调整未重跑这些专项，不能据此宣称重新完成全部 `test:quality`。

MCP 新增 16 项回归覆盖 HTTPS／回环地址与旧配置禁用删除、提交中卸载的 Token 保留、配置版本冲突、配置和凭据失败、重载失败、上层覆盖、单次刷新及迟到响应。测试使用模拟配置与凭据调用，不修改真实用户凭据，也不代表第三方 MCP 服务已验收。

模型提示回归覆盖跨会话同文案隔离、切换会话可见性、长时间缓冲及解除、回合结束、可重试／终止错误、Thread 关闭和进程停止。Edge 四尺寸 Composer／提示检查通过。既有安全回归覆盖官方目录隔离、凭据失败补偿、MCP 环境变量保护、渠道 URL 和图片输入校验。

0.160.1 同源 Runtime 兼容门禁检查 875 个生成文件及 101 处调用／订阅；设置／队列、Goal、0.159.2 到 0.160.1 的隔离历史升级与迁移、内置 rg 探针已通过。分页、回退替换、分叉、临时侧聊发送和冷恢复均使用临时 CODEX_HOME 与本机模拟 Responses 网关，不接触真实用户数据或收费模型。旧 0.154 到 0.159.2 的迁移证据保留在历史提交中，不等同于本次直接从旧安装包升级的人工验收。

image-gen 最近专项证据为 2026-10-05 的 14 项 Python 测试，覆盖预览缩放、透明背景、EXIF、防覆盖和非法输入；未执行收费生图或真实网关视觉续答。草图既有专项验证覆盖四尺寸、150% DPI、曲线边缘、单击圆点、橡皮擦、撤销／重做和画布比例。模块细节见 [Runtime](runtime-status.md)、[协议](protocol-status.md)、[客户端](app-server-client-status.md) 和 [桌面 UI](ui-shell-status.md)。

2026-10-08 审查复核：加号／权限／历史列表 21 项定向测试、工作台四尺寸探针、TypeScript、ESLint、Knip、Cargo check、前端及 Debug 构建通过；Runtime 及辅助程序哈希校验通过。此次仅调整文档，未重跑全量 Vitest；实际 SendModeControl 的四尺寸复现确认运行中菜单按 Escape 不关闭，为既有交互缺口，记录在 UI 模块状态。

## 未覆盖范围

- 真实 Windows Credential Manager 故障注入、第三方 MCP OAuth、生图／高德 API 的账号权限和配额。
- 干净机器安装升级、跨实体显示器、完整 WebView2 手写触控、超长 Diff／活动性能。
- 真实大型旧库迁移、真实网关安全缓冲／重路由、完整 WebView2 消息编辑链路。
- 图片／PDF 仍由 app-server 完整返回后判断预览大小，尚无源端分段读取；第三方网关工具图片续答问题不能宣称由内核升级解决。

## 最近发布

v0.1.11 使用 Core 0.160.1，发布资产为 NSIS 安装器、`.sig` 和 `latest.json`，入口为 [GitHub Release](https://github.com/xxxxxxxxxxxxxxxxxxx20gex/codex-shell/releases/tag/v0.1.11)。2026-10-10 本机生产打包及 Debug 构建通过；独立验证安装器 minisign 签名、可信注释签名、manifest 版本／签名／下载文件名、主 Runtime 和三个 helper 哈希通过，Updater 公钥保持不变。安装器 SHA-256：`39d57c69e79620cf3ae76f5f519ca20360ca207cee95e699cfd748f0b8fd2be1`。Release 输出的内置 rg 探针通过。这不代表干净机器安装或真实用户数据升级已经验收。

从 v0.1.9 或更早版本升级前，关闭 CS 并备份独立 CODEX_HOME。新版 Core 会迁移 legacy 历史，降级安装包不能代替数据恢复。v0.1.9 的 tag、发布分支和资产保留不变。

2026-10-08，回复代码块四尺寸 Edge 检查通过，覆盖整列宽度、长行滚动、换行切换、图标与按钮尺寸、焦点、文字下限及 reduced-motion；6 项 Markdown 定向测试通过。此为浏览器组件验证，未替代真实 WebView2 人工验收。

2026-10-11，Composer 权限／执行状态视觉调整：4 项权限测试、TypeScript、ESLint、Cargo check、前端和 Debug 构建通过，Runtime 辅助程序哈希检查通过；四尺寸 Edge 探针覆盖完全访问与执行状态布局、焦点、弹层关闭和 reduced-motion。未重跑全量测试或真实 WebView2 人工验收。

2026-10-11，发送／停止按钮视觉调整：4 项发送测试、TypeScript、ESLint、前端构建及最终 Debug 构建通过，Runtime 哈希校验通过。Cargo check 首次被运行中 Debug 文件占用阻塞，解除占用后复跑通过。含停止按钮的 Composer 四尺寸 Edge 探针通过并复核截图；未重跑全量测试或 WebView2 人工验收。
