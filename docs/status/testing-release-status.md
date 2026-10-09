# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界；模块行为由对应状态文档维护，历史由 Git 保留。
- 当前状态：v0.1.10 使用官方 Core 0.160.1，沿用既有 Updater minisign 公钥。Windows Authenticode 尚未配置，SmartScreen 仍可能提示未知发布者。
- 当前接口：`pnpm test:quality` 执行 TypeScript、ESLint、Vitest、高德离线测试、production build、Knip、Cargo check、Rust 单测、严格 Clippy 和 diff 检查。专项入口见 [测试脚本说明](../../tests/scripts/README.md)。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；`package.json` 遗留的 `test:extension-layout` 指向不存在的脚本，MCP 管理可使用现有 `test:mcp-layout`（不等价于全部扩展管理验证），不能把失效入口作为验证证据；Vite 主 chunk 超过 500 kB；Rust 既有格式差异尚未整理，`cargo fmt --check` 未纳入门禁。
- 下一步：真实系统凭据、多渠道对话、第三方 MCP OAuth、干净 Windows 安装升级和大型历史迁移验收。
- 最后更新：2026-10-08

## 当前验证基线

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

v0.1.10 使用 Core 0.160.1，发布资产为 NSIS 安装器、`.sig` 和 `latest.json`，入口为 [GitHub Release](https://github.com/xxxxxxxxxxxxxxxxxxx20gex/codex-shell/releases/tag/v0.1.10)。2026-10-08 本机生产打包及 Debug 构建通过；独立校验安装器 minisign 签名、可信注释签名、manifest 版本／下载地址、主 Runtime 和三个 helper 哈希通过，公钥与 v0.1.9 一致。Release 输出的内置 rg 探针通过；上传资产及精确校验和以 GitHub Release 为准。这不代表干净机器安装或真实用户数据升级已经验收。

从 v0.1.9 或更早版本升级前，关闭 CS 并备份独立 CODEX_HOME。新版 Core 会迁移 legacy 历史，降级安装包不能代替数据恢复。v0.1.9 的 tag、发布分支和资产保留不变。

2026-10-08，回复代码块四尺寸 Edge 检查通过，覆盖整列宽度、长行滚动、换行切换、图标与按钮尺寸、焦点、文字下限及 reduced-motion；6 项 Markdown 定向测试通过。此为浏览器组件验证，未替代真实 WebView2 人工验收。
