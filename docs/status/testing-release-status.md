# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：`pnpm test:quality` 的 Rust 阶段已从单独 `cargo check` 扩展为 check、`cargo test --lib` 和 `cargo clippy --all-targets -- -D warnings`；使用系统临时目录中的独立 target，避免正在运行的桌面调试程序锁住项目构建产物，并复用后续门禁缓存。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-14 完整 `pnpm test:quality` 以退出码 0 完成：47 个 Vitest 文件、194 项测试、TypeScript、Vite production build、Knip、`cargo check`、12 项 Rust 单元测试、严格 Clippy 和 `git diff --check` 全部通过，生产主包约 575 KB；`pnpm desktop:build` 成功生成桌面 debug 可执行文件。既有真实 Plan 和兼容网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-14
