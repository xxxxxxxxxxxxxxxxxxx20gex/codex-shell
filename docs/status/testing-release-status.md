# 测试与发布状态

- 模块职责：维护类型检查、前端单元测试、Rust 校验、Windows 构建与发行物验证。
- 当前状态：公开稳定版本仍为 `v0.1.3`；下一版本已接入 Tauri Updater，设置中的“检查并更新”会校验正式 GitHub Release 签名后下载并在 Windows 上自动重启安装。GitHub Actions 发布工作流已改为正式 Release，并会从固定 HTTPS ZIP 下载、校验 SHA-256 后提供经过批准的 Runtime 及其 companion binaries；正式发布前仍需配置两个仓库 Actions Variables。
- 最近变更：代码健康审查移除了不再被消费的 `tools.update_plan.enabled` 诊断读取和 `config/read` 客户端包装；`sendOrQueue` 的发送/排队路径统一复用同一调用形态，避免图片分支与普通消息分叉。README 已补充模型网关数据传输范围、用户主动操作的后续请求和当前未签名状态说明。生成协议类型、历史兼容回退和仍被 app-server 使用的接口保留。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:stage`、`pnpm protocol:generate`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm desktop:build`、`pnpm desktop:package`。
- 已知问题：安装包尚未代码签名，仍缺 CI、干净机器 UAC/sidecar 验证，以及超长活动输出和三栏拖拽的自动化覆盖。Vite 仍报告主 chunk 超过 500 kB。
- 下一步：配置 `CODEX_SHELL_RUNTIME_URL` 与 `CODEX_SHELL_RUNTIME_SHA256`，签名 NSIS 安装包，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-09-04；发布前按 `v0.1.1` 版本执行 `pnpm typecheck`、`pnpm lint`、`pnpm test -- --run --maxWorkers=1 --no-file-parallelism`（57 个文件/261 个测试）、`pnpm build`、`pnpm quality:knip`、`pnpm rust:check`（cargo check、14 个 Rust 单测及 Clippy）和 `pnpm desktop:package`，均通过。发布后配置就绪闸门修复又执行同一前端门禁（57 个文件/262 个测试）、`pnpm build` 和 `pnpm rust:check`，均通过。安装包绑定通过协议兼容门禁的 `codex-cli 0.153.0-alpha.5`；Vite 仍报告主 JS chunk 约 581.61 kB，安装包尚未代码签名。
- 最后更新：2026-09-04
