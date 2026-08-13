# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增项目目录/Thread `cwd` 语义、默认项目目录 Tauri 命令、项目选择器与当前历史 Thread 目录分离覆盖；运行中的命令默认折叠、Queue/Steer、Session 队列隔离、文件修改末尾汇总、模型热切换、同 Session 续聊和分叉祖先覆盖继续通过。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 staged Runtime/Tauri 的完整自动化生命周期和三栏拖拽 DOM 覆盖；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-13 共 40 个 Vitest 文件、151 项测试通过；`pnpm typecheck`、Vite production build、`pnpm rust:check`、Rust 格式和 `git diff --check` 通过。Tauri debug desktop build 通过并生成 `src-tauri/target/debug/codex-shell.exe`；生产构建主包约 544 KB，仍只有既有体积提示。此前 Rust 11 项测试、生产依赖审计、真实 Plan 和第三方网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-13
