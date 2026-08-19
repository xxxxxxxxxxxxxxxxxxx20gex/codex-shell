# 测试与发布状态

- 模块职责：维护类型检查、单元测试、集成测试、Windows 构建与发行物。
- 当前状态：类型、前端单元、Rust 路径/provider 单元和后台 app-server smoke 已覆盖；发布流水线未建立。
- 最近变更：新增 `probe-model-parameters.mjs` 真实上游参数验收脚本；使用临时 `CODEX_HOME`、固定 app-server、本地脱敏捕获代理和用户显式提供的环境变量，验证模型、推理强度、回答冗余度与上游 HTTP 状态，参数丢失、非 2xx 或 Core 忽略冗余度时非零退出。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm desktop:build`；独立测试脚本统一位于 `tests/scripts`。
- 已知问题：没有 CI、签名、MSI/NSIS 和干净机器 UAC/sidecar 验证；仍缺 Runtime 版本不匹配和三栏拖拽的自动化覆盖。
- 下一步：配置不含密钥的 CI 基线，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-08-19 参数探针对当前真实网关完成 low/medium/high/xhigh/max/ultra 推理路径和 low/medium/high verbosity 验收；全部 HTTP 200，ultra→max 与 Core 源码和单元测试定义一致。同一基线 `pnpm test:quality` 退出码 0：TypeScript、ESLint 零 warning、53 个 Vitest 文件/232 项测试、Vite production build、Knip、`cargo check`、13 项 Rust 单元测试、严格 Clippy 和 `git diff --check` 全部通过；仅保留既有 603.56 kB bundle size warning。
- 最后更新：2026-08-19
