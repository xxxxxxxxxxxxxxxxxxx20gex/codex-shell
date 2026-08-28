# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；`pnpm desktop:package` 可生成带兼容门禁 Runtime 的 NSIS Windows 安装包。
- 最近变更：新增正式打包脚本、Apache-2.0 LICENSE/NOTICE 随包资源、Runtime 暂存校验和低并发 release 配置；默认发布目标收敛为 NSIS，避免可选 WiX/MSI 工具下载阻塞 Windows 安装包生成；侧边聊天事件路由、布局滚动、未就绪发送保护、关闭中断顺序和停止 Runtime 不重连增加回归测试。
- 2026-08-26 代码健康审查：`pnpm typecheck`、`pnpm lint`、57 个 Vitest 文件/258 个测试、`pnpm quality:knip` 和 `pnpm rust:check`（14 个 Rust 单测、Clippy）通过；Knip 已固定为开发依赖并纳入 `pnpm test:quality`，本次未报告未使用文件、导出或依赖。静态行数检查发现 `useAppController.ts` 与 `sessionState.ts` 超过 500 行，作为后续职责拆分风险保留；未发现可在本次证据下安全删除的生产源码或协议生成文件。
- 2026-08-26：Runtime 暂存改为兼容协议门禁并成功验证 `codex-cli 0.149.0-alpha.4.1`；生成协议更新后前端回归扩展到 57 个文件/258 项测试，debug Tauri bundle 成功生成。
- 2026-08-26：`pnpm desktop:package` 成功生成 `src-tauri/target/release/bundle/nsis/codex-shell_0.1.0_x64-setup.exe`（93,422,196 bytes）。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:stage`、`pnpm protocol:generate`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm desktop:build`、`pnpm desktop:package`；Runtime staging 自动执行协议兼容门禁，独立测试脚本统一位于 `tests/scripts`。
- 已知问题：安装包尚未代码签名；MSI 未纳入默认发布目标；仍缺 CI、干净机器 UAC/sidecar 验证，以及 Runtime 兼容门禁、超长单条活动输出和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，签名 NSIS 安装包，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-21 完整前端回归为 56 个 Vitest 文件/247 项测试，TypeScript、ESLint、Vite production build 通过；Rust check 与 14 项 Rust 单元测试通过。2026-08-24 侧边聊天生命周期、布局、滚动和发送保护改动后，`pnpm test -- --run` 为 58 个文件/255 项测试通过，`pnpm typecheck`、`pnpm lint`、`pnpm build`、`cargo check --manifest-path src-tauri/Cargo.toml` 和 `pnpm desktop:build` 通过；桌面 debug 产物为 `src-tauri/target/debug/codex-shell.exe`。`pnpm desktop:package` 成功生成 `src-tauri/target/release/bundle/nsis/codex-shell_0.1.0_x64-setup.exe`（约 85.6 MB）；静默安装检查主程序、4 个 Runtime/companion 文件和 3 个许可证资源存在，随后静默卸载成功。Knip 当时未能产出报告；当前仓库未将 Knip 配置为依赖或质量门禁，因而不能把无效代码检查称为已通过。当前前端 bundle 约 565.30 kB，仍有 Vite bundle size warning。
- 2026-08-24 review：分支治理和 Wiki 式文档改动未引入源码变化；侧边聊天生命周期 review 已补充关闭中断、停止 Runtime 不重连和 Session 切换视图回收测试。TypeScript、ESLint、58 个 Vitest 文件/255 项测试、Vite production build、Rust check 与 14 项 Rust 测试再次通过。Knip 尚未固定为项目依赖；安装包未签名、Runtime 获取不可复现和干净机器验收仍待后续处理。
- 2026-08-25 review：TypeScript、ESLint、57 个 Vitest 文件/256 项测试和 Vite production build 通过；Rust check 与 14 项 Rust 单测通过，独立临时 target 的 `cargo clippy --all-targets -- -D warnings` 通过。Knip 当前未配置为项目依赖或质量门禁，未产出无效代码报告。项目文件内嵌 inspector 与旧 DiffInspector 清理后的 Tauri debug build 已通过；本轮项目文件标题栏修复后，确认默认 target 的拒绝访问来自仍在运行的本项目 `src-tauri\target\debug\codex.exe` app-server。`scripts/build-desktop.ps1` 现在只按规范化路径停止本项目 target 下的旧进程，再执行默认构建；时间线滚动控制新增上一条、下一条和返回最新的定向交互测试；本轮未重复生成安装包。
- 最后更新：2026-08-26

- 2026-08-28 代码健康审查：移除无读取方的 `workspaceExplorerOpen` 重复状态，Explorer 挂载条件与当前项目文件视图保持一致；`pnpm typecheck`、`pnpm lint`、`pnpm test -- --run`（57 个文件/258 个测试）、`pnpm build` 和 `cargo check --manifest-path src-tauri/Cargo.toml` 通过。`pnpm quality:knip` 因 Node/OXC 解析阶段 ArrayBuffer 分配失败未完成，不能视为通过；该失败属于本机资源/工具运行问题，未产生 Knip 诊断。
