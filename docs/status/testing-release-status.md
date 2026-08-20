# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：浅色主题颜色别名迁移完成；静态门禁确认被迁移的颜色别名与消息导航固定 glow 均无消费者，浏览器 computed style 与四档桌面视口验证加入当前人工回归基线。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-20 Runtime/协议对齐基线 `pnpm test:quality` 退出码 0：TypeScript、ESLint 零 warning、52 个 Vitest 文件/238 项测试、Vite production build、Knip、`cargo check`、14 项 Rust 单元测试、严格 Clippy 和 `git diff --check` 全部通过；仅保留既有约 604.88 kB bundle size warning。真实本机工具探针完成 Turn 并观察到两次 `commandExecution`；`pnpm desktop:build` 成功重建 debug 桌面端，输出目录包含与 manifest 哈希一致的主 Runtime 和三个 companion binaries。
- 最后更新：2026-08-20
