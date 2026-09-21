# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界。模块行为由对应状态文档维护，历史测试流水账由 Git 保留。
- 当前状态：v0.1.7 已正式发布，`release/v0.1.7` 和 `v0.1.7` Tag 指向发布提交，`main` 从该提交继续开发；NSIS 安装器、Updater 签名和 `latest.json` 已上传 GitHub。后续功能从 `main` 开发，下一版本号尚未确定。未配置 Windows Authenticode，SmartScreen 仍可能提示未知发布者。
- 最近变更：CS Office 隔离探针扩展至五项中文 Skill；新增市场源目录刷新回归，以及独立 Python 辅助脚本测试。办公结构、渲染与模型任务验收的边界见 [扩展能力](agent-capabilities-status.md)。Python 专项测试不在通用质量门禁中，命令与依赖见 [测试脚本说明](../../tests/scripts/README.md)。
- 当前接口：`pnpm test:quality` 依次执行 TypeScript、ESLint、Vitest、`pnpm test:amap`、production build、Knip、`pnpm rust:check` 和 diff 检查。完整门禁需要 Bun；Rust 入口包含 Cargo check、单元测试和严格 Clippy。协议、真实 Runtime 及五项四视口布局检查独立运行，入口见 [测试脚本说明](../../tests/scripts/README.md) 和 `package.json`。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；Vite 主 chunk 超过 500 kB；`cargo fmt --check` 尚未纳入门禁，现有 Rust 文件有格式差异。
- 下一步：补真实系统凭据、多渠道对话、第三方 MCP OAuth，以及干净 Windows 用户环境安装和升级验收。
- 最后更新：2026-09-22

## 当前开发验证基线

2026-09-22，质量门禁中的 TypeScript、ESLint、69 个文件 / 376 项前端测试、14 项高德 Bun 测试、production build、Knip、Cargo check、44 项 Rust 单测（1 项交互测试忽略）与严格 Clippy 通过。首次门禁仅在最后的 diff 检查发现 Skill 文件末尾多余空行；修正后单独复跑 `git diff --check` 通过。`pnpm desktop:build` 成功生成 0.1.7 Debug，未生成新 Release。

同日四尺寸扩展布局通过，覆盖 1440×900、1280×780、1024×720 和 900×700；办公辅助脚本 7 项测试、插件及五项 Skill 校验、真实隔离扩展探针通过。Knip 未发现未使用文件、导出或依赖。LibreOffice 调用使用模拟，未验证真实 Office 转换及模型驱动的办公产物；此基线不代表全量桌面或外部服务验收。

## 专项验证与未覆盖范围

模块的定向验证由各模块状态维护，完整历史由 Git 保存：

- [Runtime](runtime-status.md) 与 [协议](protocol-status.md)：隔离探针不等于真实模型对话；分页和运行中换模仍受 Runtime 限制。
- [扩展能力](agent-capabilities-status.md)：真实办公产物、生图／高德 API 和干净机器依赖未验收。
- [项目与线程](workspace-thread-status.md) 与 [桌面 UI](ui-shell-status.md)：保留真实资源管理器定位证据；Chromium 测试不等于 WebView2 剪贴板权限验收，大型项目 watch 滚动仍缺人工验证。
- [模型配置](model-config-status.md) 与 [凭据](credentials-status.md)：真实系统凭据故障注入、多渠道对话及第三方 MCP OAuth 尚需验收。
- [时间线](timeline-status.md)：历史消息编辑仍缺真实 Runtime 链路及对应四视口验收。

## 最近发布基线

2026-09-20，v0.1.7：发布时完整门禁为 68 文件 / 372 项前端测试、14 项高德测试、43 项 Rust 单测（1 项忽略），以及类型、Lint、构建、Knip、Cargo check、Clippy 和 diff 检查。重新核验主 Runtime 与三个同源 helper 的 SHA-256，通过 codex-cli 0.154.0-alpha.6.2 协议兼容门禁、协议表面测试、隔离协议探针和扩展探针。探针覆盖 Thread 设置与队列、Skills 持久化启停、MCP 配置增删与 reload、本地插件安装卸载、当时三项 CS Office Skill 的安装路径及重启后开关保持，以及高德发现与禁用。

`pnpm release:package` 生成 NSIS 安装器、`.sig` 和 `latest.json`，通过配置公钥的 Ed25519 / BLAKE2b 验签、可信注释签名及 manifest 版本、下载 URL 和签名一致性检查；三项资产作为 v0.1.7 上传 GitHub Release。安装器 SHA-256：`4a4d8ce2e0892f47ebed8c9a557225c7424eedea525994b153e518472608a75b`。

自动发现的更新 Runtime 因缺少 `thread/rollback` 被门禁拒绝，随后显式使用哈希匹配的暂存同源 Runtime 完成发布。用户已完成部分真实桌面检查且未报告问题，但未枚举具体场景；不据此宣称全量桌面、真实外部 API 或干净机器安装升级验收通过。
