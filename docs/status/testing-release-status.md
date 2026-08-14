# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增权限菜单 DOM、三档 app-server 沙盒映射、审批者解耦、完全访问无审批和 Thread/Turn 双层参数测试；Queue 输入新增审批者快照类型约束。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 staged Runtime/Tauri 的完整自动化生命周期和三栏拖拽 DOM 覆盖；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-14 共 47 个 Vitest 文件、189 项测试通过；`pnpm typecheck`、Vite production build、`pnpm rust:check` 和 Knip 通过。生产主包约 574 KB，仍只有既有体积提示。迁移后 Rust 从 clean target 全量重编译通过；此前 Rust 单元、真实 Plan 和第三方网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-14
