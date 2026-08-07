# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增上下文用量计算与 Token 通知 reducer 测试；完成全项目无效/冗余代码审查，使用严格 TypeScript、Knip 与 Rust Clippy 复核手写文件、导出、依赖、循环依赖和警告。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 sidecar 验证。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-07 共 10 个 Vitest 文件、41 项测试及严格 TypeScript 检查通过；Knip 无手写未使用导出、依赖或循环依赖，Rust Clippy `-D warnings`、Vite production build、Rust check 和 Tauri debug build 均通过；真实 app-server 命令能力 smoke 通过。
- 最后更新：2026-08-07
