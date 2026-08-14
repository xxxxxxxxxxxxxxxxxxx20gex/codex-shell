# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：阶段性代码质量审查确认 Knip 为零、生产依赖无已知漏洞、生产 TypeScript/CSS/Rust 无达到阈值的重复块；jscpd 的 13 处重复全部位于测试夹具和场景搭建。源码与路径扫描未发现密钥或开发机绝对路径。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；`pnpm test:quality` 当前只通过 `pnpm rust:check` 执行 `cargo check`，不会自动运行 Rust 单元测试或 Clippy；仍缺 Runtime 版本不匹配、快速重启竞态和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-14 共 47 个 Vitest 文件、191 项测试通过；`pnpm typecheck`、Vite production build、`pnpm rust:check` 和 Knip 通过，生产主包约 575 KB。Rust 源码包含 11 项单元测试；本轮独立 target 的测试执行已进入后续 Clippy，Clippy 未在工具超时内返回可记录结果，因此不计入本轮通过基线。既有真实 Plan 和兼容网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-14
