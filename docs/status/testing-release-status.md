# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：Runtime 日志测试已迁移到独立 Store，覆盖 150ms 批量发布、ANSI 清理、单行截断、200 条上限、订阅和日志面板严重级别；阶段性审查增加 jscpd 克隆检测和 Knip 无效代码检查。既有原生 Item、每日默认工作区、Session、CODEX_HOME 和有界状态覆盖继续保留。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 sidecar 验证；Plan、CODEX_HOME 切换、Session 操作和三栏拖拽目前以协议/纯函数/静态渲染测试为主，尚缺完整 DOM 与真实 app-server 生命周期集成测试；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-10 共 17 个 Vitest 文件、71 项测试通过；TypeScript 检查、Vite production build、Knip、9 项 Rust 单元测试、Cargo check 和 Clippy `-D warnings` 通过。真实 Plan smoke 证据继续有效。
- 最后更新：2026-08-10
