# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增无边框窗口标题栏回归测试，覆盖最小化、最大化/还原、关闭和双击标题栏切换窗口大小；本轮补充 app-server 监听器初始化失败后的可重连测试，以及反向请求替换 handler 的 disposer 隔离测试；保留通用设置、链接导航、模型切换预采样压缩及 Steer 顺序测试。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-18 修改后完整 `pnpm test:quality` 以退出码 0 完成：ESLint 零 warning、53 个 Vitest 文件、227 项测试、TypeScript、Vite production build、Knip、`cargo check`、13 项 Rust 单元测试、严格 Clippy 和 `git diff --check` 全部通过；随后重新生成无边框桌面 debug 可执行文件。
- 最后更新：2026-08-18
