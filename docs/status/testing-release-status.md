# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：移除 react-virtuoso，时间线改为单一原生滚动容器；程序定位、用户滚动 settle 锁、底部恢复和 Session 切换均由一个显式策略控制，避免虚拟列表测量事件与自动贴底竞争；新增 Session 临时提示的手动关闭、自动消失和卸载清理测试；保留权威 Thread settings/Goal 映射和审查状态单调性测试。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配、超长单条活动输出和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-21 本次滚动重构与 Session 临时提示改动的定向测试通过；完整前端回归为 56 个 Vitest 文件/247 项测试，TypeScript、ESLint、Vite production build 通过；Rust check 与 14 项 Rust 单元测试通过。Knip 在 Oxc parser 分配 ArrayBuffer 时因当前 Windows/Node 内存分配失败（`RangeError: Array buffer allocation failed`），未产生无效代码报告。当前 bundle 约 555.91 kB，仍有 Vite bundle size warning。
- 最后更新：2026-08-21
