# 测试与发布状态

- 模块职责：维护类型检查、静态检查、前后端测试、构建、Runtime 兼容门禁和 Windows 发布证据。
- 当前状态：公开稳定版为 `v0.1.5`，当前开发及待发布版本为 `v0.1.6`。v0.1.5 的 NSIS 安装器、Updater 签名和 `latest.json` 已上传 GitHub；安装器未配置 Windows Authenticode，SmartScreen 仍可能提示未知发布者。
- 最近变更：终端空 stdin 轮询不再进入时间线，非空交互进入默认折叠组；剪贴板图片保存到隔离 CODEX_HOME 后作为 `localImage` 输入，Tauri 边界限制 MIME 与 20 MiB 单张大小；项目文件使用独立的 400px 默认 Inspector 宽度。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm build`、`pnpm rust:check`、`pnpm test:protocol-surface`、四项四视口布局脚本、`pnpm desktop:build` 和 `pnpm release:package`。
- 已知问题：真实 Windows Credential Manager、多渠道 API 对话、第三方 MCP OAuth 和干净机器升级未在本轮自动测试；仍缺 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖。Vite 主 chunk 超过 500 kB。`cargo fmt --check` 尚未纳入质量门禁，现有 Rust 文件仍有格式差异。
- 下一步：完成 `v0.1.6` 签名打包、资产验签和 GitHub Release 上传；随后在干净 Windows 用户环境抽查安装与从 v0.1.5 更新。
- 验证证据：2026-09-16；`pnpm test:quality` 通过：TypeScript、ESLint、Vitest（64 文件 / 329 项）、production build、Knip、Cargo check、42 项 Rust 单测、严格 Clippy 和 `git diff --check` 均通过；协议表面门禁和 Debug 构建通过。扩展、渠道、图片批注和终端交互四项布局脚本均在 1440×900、1280×780、1024×720、900×700 通过。当前证据不代表真实模型、MCP 或安装升级已验收。
- 最后更新：2026-09-16
