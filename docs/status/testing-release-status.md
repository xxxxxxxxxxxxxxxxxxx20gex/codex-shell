# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：阶段性代码质量审查新增 Composer 拖拽生命周期与附件菜单关闭回归；检查未使用项、重复代码、监听器/定时器/Store 释放、敏感信息和开发机绝对路径、生产依赖漏洞及 Rust Clippy。固定 Runtime 和生成协议保持不变。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 staged Runtime/Tauri 的完整自动化生命周期和三栏拖拽 DOM 覆盖；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-13 共 43 个 Vitest 文件、166 项测试通过；`pnpm typecheck`、Vite production build、`pnpm rust:check`、Knip、`git diff --check` 和 `cargo clippy --all-targets -- -D warnings` 通过。jscpd 检查 83 个非生成源码文件未发现达到 6 行/60 tokens 阈值的克隆，生产依赖无已知漏洞，仓库未发现凭据或开发机绝对路径。生产主包约 566 KB，仍只有既有体积提示。Tauri debug 构建通过并生成 `src-tauri/target/debug/codex-shell.exe`；此前 Rust 单元、真实 Plan 和第三方网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-13
