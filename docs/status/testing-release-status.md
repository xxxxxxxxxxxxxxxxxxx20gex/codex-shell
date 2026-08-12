# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增连续回答流、命令折叠、文件修改末尾汇总、模型热切换及 Runtime 重启后同 Session 续聊、每 Turn 权限覆盖、分叉祖先保留和移除动态 Session 编号的回归覆盖；桌面 debug 构建继续校验固定 Runtime sidecar。阶段性健康审查验证 Knip 无未使用项、jscpd 仅发现测试夹具重复。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 staged Runtime/Tauri 的完整自动化生命周期和三栏拖拽 DOM 覆盖；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-12 共 37 个 Vitest 文件、126 项测试通过；Rust 11 项测试通过；`pnpm typecheck`、Vite production build、`pnpm rust:check` 和 Tauri debug desktop build 通过。debug 目录中的三个 Runtime 文件 hash 与 manifest 一致；`pnpm dlx knip --no-progress` 无输出且成功，jscpd 仅报告 3 处测试夹具重复（0.38% 行、0.30% token），此前生产依赖审计、真实 Plan 和第三方网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-12
