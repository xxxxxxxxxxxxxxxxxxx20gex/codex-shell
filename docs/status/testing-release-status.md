# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增 Session 展示纯函数与组件测试，覆盖动态编号、删除后重排、名称、路径/ID 引用和操作说明；新增 Plan 与默认 Turn 请求结构、200 Turn 有界状态、Diff/Plan 同步裁剪，以及 CODEX_HOME 空目标迁移和双目录冲突测试。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 sidecar 验证；Plan、CODEX_HOME 切换、Session 操作和三栏拖拽目前以协议/纯函数/静态渲染测试为主，尚缺完整 DOM 与真实 app-server 生命周期集成测试。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-10 共 14 个 Vitest 文件、56 项测试通过；TypeScript 检查、Vite production build、Knip、8 项 Rust 单元测试、Rust check 和 Clippy `-D warnings` 通过。真实 Plan smoke 完成并收到 Plan delta/item；当前调试程序占用 sidecar，因此本轮未覆盖桌面程序重建，沿用清理前成功构建证据。
- 最后更新：2026-08-10
