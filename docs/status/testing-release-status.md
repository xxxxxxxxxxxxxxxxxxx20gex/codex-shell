# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：设置测试新增四分类导航、运行环境、诊断和指定分页直达覆盖；旧 `StatusInspector` 测试随组件删除，elevated Sandbox 行为迁入设置测试继续覆盖。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-20 当前代码基线 `pnpm test:quality` 退出码 0：TypeScript、ESLint 零 warning、52 个 Vitest 文件/238 项测试、Vite production build、Knip、`cargo check`、14 项 Rust 单元测试、严格 Clippy 和 `git diff --check` 全部通过；仅保留既有约 604.62 kB bundle size warning。`pnpm desktop:build` 成功生成 `src-tauri/target/debug/codex-shell.exe`；本地浏览器检查 1280×780 和 900×700 布局，设置无横向溢出且各分页保持固定外框尺寸。
- 最后更新：2026-08-20
