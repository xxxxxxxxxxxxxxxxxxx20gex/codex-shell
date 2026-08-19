# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：桌面品牌图标改由 `assets/branding/cs-app-icon.svg` 单一母版生成 Windows PNG/ICO、macOS ICNS 及平台派生资源；桌面构建负责验证新图标已嵌入可执行文件。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-19 参数探针对当前真实网关完成 low/medium/high/xhigh/max/ultra 推理路径、low/medium/high verbosity、auto/concise/detailed/none summary，以及标准/priority service tier 验收；全部 HTTP 200，ultra→max 与 Core 源码和单元测试定义一致。当前代码基线 `pnpm test:quality` 退出码 0：TypeScript、ESLint 零 warning、53 个 Vitest 文件/237 项测试、Vite production build、Knip、`cargo check`、14 项 Rust 单元测试、严格 Clippy 和 `git diff --check` 全部通过；仅保留既有约 604.88 kB bundle size warning。清理当前包的可再生成 Cargo 缓存后，`pnpm desktop:build` 成功生成 debug 桌面程序；从新 EXE 反向提取的关联图标与 `CS` 母版一致，排除了旧资源缓存。Headless 壳层检查确认标题栏和新对话空状态均引用同一 CS 母版且不挤压标题。
- 最后更新：2026-08-19
