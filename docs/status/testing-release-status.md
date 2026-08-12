# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增左侧消息轨道当前 Turn 高亮、原生 `turn/steer` 中途用户消息顺序、完整完成态清理流式残留、执行过程归并、状态中文化及安全 Markdown 渲染的回归覆盖；既有连续回答流、命令折叠、文件修改末尾汇总、模型热切换、同 Session 续聊、每 Turn 权限覆盖和分叉祖先覆盖继续通过。桌面 debug 构建继续校验固定 Runtime sidecar。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 staged Runtime/Tauri 的完整自动化生命周期和三栏拖拽 DOM 覆盖；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-12 共 38 个 Vitest 文件、133 项测试通过；`pnpm typecheck`、Vite production build、`pnpm dlx knip`、`pnpm rust:check` 和 Tauri debug desktop build 通过，固定 Runtime sidecar 校验成功，产物为 `src-tauri/target/debug/codex-shell.exe`。生产构建仅保留主包约 537 KB 的体积提示，不影响功能，后续按路由与重依赖边界评估拆包；此前 Rust 11 项测试、生产依赖审计、真实 Plan 和第三方网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-12
