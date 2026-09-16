# 测试与发布状态

- 模块职责：维护类型检查、静态检查、前后端测试、构建、Runtime 兼容门禁和 Windows 发布证据。
- 当前状态：`main` 开发版本为 `0.1.7`，公开稳定版为 `v0.1.6`。v0.1.6 的 NSIS 安装器、Updater 签名和 `latest.json` 已上传 GitHub；安装器未配置 Windows Authenticode，SmartScreen 仍可能提示未知发布者。
- 最近变更：终端空 stdin 轮询不再进入时间线，非空交互进入默认折叠组；剪贴板图片保存到隔离 CODEX_HOME 后作为 `localImage` 输入，Tauri 边界限制 MIME 与 20 MiB 单张大小；项目文件使用独立的 400px 默认 Inspector 宽度。生成协议与暂存 Runtime 已更新到 codex-cli 0.154.0-alpha.6.2，并补充 MCP userVerification 拒绝路径回归。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm build`、`pnpm rust:check`、`pnpm test:protocol-surface`、四项四视口布局脚本、`pnpm desktop:build` 和 `pnpm release:package`。
- 已知问题：真实 Windows Credential Manager、多渠道 API 对话、第三方 MCP OAuth 和干净机器升级未在本轮自动测试；仍缺 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖。Vite 主 chunk 超过 500 kB。`cargo fmt --check` 尚未纳入质量门禁，现有 Rust 文件仍有格式差异。
- 下一步：在干净 Windows 用户环境抽查安装与从 v0.1.5 更新；继续补真实系统凭据、多渠道 API 对话和第三方 MCP OAuth 人工验收。
- 验证证据：2026-09-16；`pnpm test:quality` 通过：TypeScript、ESLint、Vitest（64 文件 / 330 项）、production build、Knip、Cargo check、42 项 Rust 单测、严格 Clippy 和 `git diff --check` 均通过；协议表面门禁、codex-cli 0.154.0-alpha.6.2 兼容门禁、本地模拟网关协议探针和 Debug 构建通过。扩展、渠道、图片批注和终端交互四项布局脚本均在 1440×900、1280×780、1024×720、900×700 通过。生产 NSIS 安装器、`.sig` 和 `latest.json` 已生成，manifest 版本与 URL 正确，安装器通过配置公钥验签并上传 GitHub Release。当前证据不代表真实模型、第三方 MCP 或干净机器安装升级已验收。
- 最后更新：2026-09-16
