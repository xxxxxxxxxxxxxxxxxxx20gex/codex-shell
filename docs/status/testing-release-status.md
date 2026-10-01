# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界。模块行为由对应状态文档维护，历史测试流水账由 Git 保留。
- 当前状态：v0.1.8 已正式发布，包含内置 Skill 资源路径兼容和错误信息脱敏修复；Updater minisign 已启用，Windows Authenticode 尚未配置，SmartScreen 仍可能提示未知发布者。
- 当前接口：`pnpm test:quality` 依次执行 TypeScript、ESLint、Vitest、`pnpm test:amap`、production build、Knip、`pnpm rust:check` 和 diff 检查。协议、Runtime、四视口布局和 Skill 专项验证独立运行，入口见 [测试脚本说明](../../tests/scripts/README.md) 与 `package.json`。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；Vite 主 chunk 超过 500 kB；`pnpm quality:knip` 当前因 `src/features/models/channels.ts` 的 `OPENAI_BUILTIN_MODEL_IDS` 未使用导出失败；`cargo fmt --check` 尚未纳入门禁。
- 下一步：补真实系统凭据、多渠道对话、第三方 MCP OAuth，以及干净 Windows 用户环境安装和升级验收。
- 最后更新：2026-10-01

2026-10-01，新增 Markdown 代码块四尺寸 Edge 布局探针，验证短代码收拢、长行内部滚动、复制按钮焦点和截图；对应模块事实见 [任务时间线](timeline-status.md)。

2026-10-01，输入区探针扩展到真实待发送列表、添加、权限与发送控件，四尺寸 Edge 检查与截图复核通过；新增队列组件 5 项定向测试通过，覆盖编辑／删除、菜单交互、失败保留、重复点击保护、恢复发送与附件预览。TypeScript、ESLint、生产构建和 Cargo check 通过；该次定向验证不替代真实 WebView2 队列链路验收，布局与组件事实见 [桌面 UI](ui-shell-status.md)。

## 当前验证基线

2026-10-01，输入区四尺寸浏览器探针、Edge 截图复核、68 个文件 / 362 项前端测试、ESLint、TypeScript、生产构建、Cargo check、Rust 51 项单测（1 项交互测试忽略）、严格 Clippy、Debug 构建和本轮协议／边界回归均通过。Knip 失败项已在“已知问题”明确记录，未将其伪装成完整门禁通过。

2026-10-01，模型快速切换服务层级校准及精确提示过滤后，69 个文件 / 370 项前端测试、ESLint、TypeScript、Cargo check 和 Debug 构建通过。Knip 仍因上述未使用导出失败；本次未调用真实模型，也未重跑 Rust 单测或四视口 UI 专项。

本轮协议／边界回归覆盖三页历史分页顺序、20 MiB 图片／PDF 预览上限、HTTPS／本机回环 HTTP 渠道校验和 `thread/project/updated` 的权威 Thread 刷新。图片/PDF 当前仍由 app-server `fs/readFile` 完整返回后才判断大小，尚未实现源端分段读取。

## 未覆盖范围

- 真实 Windows Credential Manager 故障注入、真实第三方 MCP OAuth、真实生图／高德 API 的账号权限与配额。
- 干净机器安装升级、跨实体显示器、完整 WebView2 工具栏交互、超长 Diff／活动性能验收。
- 源端分段读取超大文件，以及真实 Runtime 消息编辑链路的完整端到端验收。

模拟 Runtime、浏览器探针和局部手工检查不替代上述验收。模块定向证据分别见 [Runtime](runtime-status.md)、[协议](protocol-status.md)、[扩展能力](agent-capabilities-status.md)、[项目与线程](workspace-thread-status.md)、[桌面 UI](ui-shell-status.md)、[模型配置](model-config-status.md)、[凭据](credentials-status.md) 和 [时间线](timeline-status.md)。

## 最近发布

v0.1.8 使用 `codex-cli 0.154.0-alpha.6.2` 同源 Runtime，已生成并上传 NSIS 安装器、`.sig` 和 `latest.json`。发布脚本通过 Runtime 哈希、协议兼容门禁和 updater 签名校验；发布历史及精确资产校验由 Git 与 GitHub Release 保留，不在状态文档重复。
