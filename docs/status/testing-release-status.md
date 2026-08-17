# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：完整质量门禁已覆盖 Quiet Graphite Workbench 收敛和 `useAppController` 拆分；后台 Headless Edge 额外检查 1440×900、1280×780、1024×720、900×700 与 899×700 响应式边界，不操作桌面环境。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-17 完整 `pnpm test:quality` 以退出码 0 完成：50 个 Vitest 文件、203 项测试、TypeScript、Vite production build、Knip、`cargo check`、12 项 Rust 单元测试、严格 Clippy 和 `git diff --check` 全部通过，生产主包约 590 KB；静态设计门禁确认低于 11px 的生产字号、Token 外十六进制色、旧末尾覆盖块和 Unicode 操作图标均为 0。固定 Runtime Goal 探针仍保留；`pnpm desktop:build` 成功生成桌面 debug 可执行文件。
- 最后更新：2026-08-17
