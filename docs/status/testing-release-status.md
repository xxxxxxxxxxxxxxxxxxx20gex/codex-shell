# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：补齐 Virtuoso 内置 `followOutput` 的滚动竞争回归；运行中拖动滚动条时，自有贴底和 Virtuoso 内部贴底都会暂停，并覆盖没有 pointer 事件时由可信 scroll 识别用户上滑、原生拖动释放的 mouseup 和失焦兜底；新增权威 Thread settings/Goal 映射和审查状态单调性测试。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-21 本次滚动修复的定向 lint 与 18 项时间线测试通过；完整门禁中 55 个 Vitest 文件/253 项测试、TypeScript、ESLint、Vite production build 已通过，Knip 在 Oxc parser 分配 ArrayBuffer 时因当前 Windows/Node 内存分配失败（`RangeError: Array buffer allocation failed`），未产生无效代码报告；Rust 检查尚未因门禁短路执行。上一完整基线仍为 55 个文件/252 项测试、Knip、Cargo check、14 项 Rust 测试和严格 Clippy 全部通过。当前保留约 611.78 kB bundle size warning。
- 最后更新：2026-08-21
