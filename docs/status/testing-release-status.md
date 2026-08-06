# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：本地构建基线通过，发布流水线未建立。
- 最近变更：安装 Rust stable 与 MSVC Build Tools；增加前端、Rust 和完整桌面构建脚本。
- 当前接口：`pnpm typecheck`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`。
- 已知问题：未增加自动化测试、CI、签名、MSI/NSIS 和安装后 sidecar 验证。
- 下一步：增加 Vitest、协议模拟测试和 MSI/NSIS smoke test。
- 验证证据：类型检查、Vite production build、Cargo check 与 Tauri debug executable build 全部通过；生成 `13,380,608` 字节的 `codex-shell.exe`。
- 最后更新：2026-08-06
