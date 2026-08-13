# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增统一“添加文件和文件夹”菜单，验证菜单只暴露一个动作且所有选择路径通过同一回调；剪贴板图片和原生输入构造覆盖继续验证。完成后过程折叠和命令抽屉的时间线覆盖继续验证最终回答出现后前置活动进入默认折叠状态、Steer 多消息仍保持原生顺序、连续原生命令项聚合且默认折叠，同时保留单项详情。
- 当前接口：`pnpm typecheck`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 staged Runtime/Tauri 的完整自动化生命周期和三栏拖拽 DOM 覆盖；Runtime 版本不匹配和快速重启竞态尚无自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-13 共 42 个 Vitest 文件、162 项测试通过；`pnpm typecheck`、Vite production build、`pnpm rust:check`、Rust 格式、Knip 和 `git diff --check` 通过，生产主包约 546 KB，仍只有既有体积提示。Tauri debug 构建通过并生成 `src-tauri/target/debug/codex-shell.exe`；此前 Rust 11 项测试、生产依赖审计、真实 Plan 和第三方网关 app-server smoke 证据继续有效。
- 最后更新：2026-08-13
