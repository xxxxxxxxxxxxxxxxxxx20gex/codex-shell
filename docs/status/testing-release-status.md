# 测试与发布状态

- 模块职责：维护类型检查、前端单元测试、Rust 校验、Windows 构建与发行物验证。
- 当前状态：公开稳定版本仍为 `v0.1.4`；当前版本已接入 Tauri Updater，设置中的“检查并更新”会校验正式 GitHub Release 签名后下载并在 Windows 上自动重启安装。个人发布通过 `pnpm release:package` 在本机暂存经过批准的 Runtime、生成签名 NSIS 安装包和 `latest.json`，再手动上传到同名 Release。
- 最近变更：`v0.1.4` 已通过本机发布流程生成并上传安装器、minisign `.sig` 和 `latest.json`，设置中的更新入口已随当前公开版本生效；安装器仍未进行 Windows Authenticode 代码签名。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:stage`、`pnpm protocol:generate`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm desktop:build`、`pnpm desktop:package`。
- 已知问题：安装包尚未进行 Windows Authenticode 代码签名，仍缺 CI，以及超长活动输出和三栏拖拽的自动化覆盖。Vite 仍报告主 chunk 超过 500 kB。
- 下一步：建立 CI 和 Windows Authenticode 代码签名流程，并把 Runtime 兼容门禁纳入 CI。
- 验证证据：2026-09-04，在 `v0.1.1` 阶段执行 `pnpm typecheck`、`pnpm lint`、`pnpm test -- --run --maxWorkers=1 --no-file-parallelism`（57 个文件/261 个测试）、`pnpm build`、`pnpm quality:knip`、`pnpm rust:check`（cargo check、14 个 Rust 单测及 Clippy）和 `pnpm desktop:package`，均通过；配置就绪闸门修复后又执行同一前端门禁（57 个文件/262 个测试）、`pnpm build` 和 `pnpm rust:check`，均通过。2026-09-07，`v0.1.4` 发布包绑定通过协议兼容门禁的 `codex-cli 0.153.4`，GitHub Release 已包含安装器、minisign `.sig` 和 `latest.json`，并完成干净 Windows 用户环境的 UAC、sandbox readiness 和 elevated 命令验证。Vite 最近记录的主 JS chunk 约 581.61 kB；安装器仍未进行 Windows Authenticode 代码签名。
- 最后更新：2026-09-08
