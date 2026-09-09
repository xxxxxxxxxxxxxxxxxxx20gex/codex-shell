# 测试与发布状态

- 模块职责：维护类型检查、前端单元测试、Rust 校验、Windows 构建与发行物验证。
- 当前状态：公开稳定版本仍为 `v0.1.4`；当前版本已接入 Tauri Updater，设置中的“检查并更新”会校验正式 GitHub Release 签名后下载并在 Windows 上自动重启安装。个人发布通过 `pnpm release:package` 在本机暂存经过批准的 Runtime、生成签名 NSIS 安装包和 `latest.json`，再手动上传到同名 Release。
- 最近变更：扩展管理新增安全凭据配置、配置冲突、Skill 所有权、插件待认证状态及 MCP 关闭/监听释放测试；提供隔离 Runtime 和浏览器布局脚本。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:stage`、`pnpm protocol:generate`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm runtime:probe-extensions`、`pnpm test:extension-layout`、`pnpm desktop:build`、`pnpm desktop:package`。
- 已知问题：安装包尚未进行 Windows Authenticode 代码签名，仍缺 CI，以及超长活动输出和三栏拖拽的自动化覆盖。Vite 仍报告主 chunk 超过 500 kB。
- 下一步：建立 CI 和 Windows Authenticode 代码签名流程，并把 Runtime 兼容门禁纳入 CI。
- 验证证据：2026-09-09；TypeScript、ESLint、Vitest、Knip、Vite production build 通过。pnpm rust:check 的 Cargo check、16 项 Rust 单测、Clippy 通过；使用临时 CARGO_TARGET_DIR 的 tauri build --debug --no-bundle 成功，未中断旧 Debug 进程。runtime:probe-extensions 验证 Skills 持久化启停、MCP 版本化写入与删除/reload、本地 Marketplace/Plugin 安装卸载。test:extension-layout 通过 1440×900、1280×780、1024×720、900×700 的三页面布局、文字下限、焦点及 reduced-motion 检查（模拟 transport，非真实 Tauri 端到端）。
- 最后更新：2026-09-09
