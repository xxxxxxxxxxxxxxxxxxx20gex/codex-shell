# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增时间线智能滚动/用户消息导航、Diff 文件状态/跳转、工作区 watch 通知过滤/防抖刷新/卸载清理的 happy-dom 行为测试；桌面 debug 构建继续使用后台脚本验证。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 sidecar 验证；仍缺 staged Runtime/Tauri 的完整自动化生命周期和三栏拖拽 DOM 覆盖；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-11 共 33 个 Vitest 文件、114 项测试通过；TypeScript、Vite production build、Knip、jscpd（72 个非生成文件、0 clone）、`pnpm audit --prod`、`pnpm rust:check` 和 Tauri debug desktop build 通过。真实 Plan 和第三方网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-11
