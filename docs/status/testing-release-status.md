# 测试与发布状态

- 模块职责：维护类型检查、前端单元测试、Rust 校验、Windows 构建与发行物验证。
- 当前状态：前端 TypeScript/ESLint/Vitest、Rust check/单测/Clippy 和 Vite 生产构建均可执行；`pnpm desktop:package` 可生成带兼容门禁 Runtime 的 NSIS 安装包。
- 最近变更：代码健康审查移除了不再被消费的 `tools.update_plan.enabled` 诊断读取和 `config/read` 客户端包装；`sendOrQueue` 的发送/排队路径统一复用同一调用形态，避免图片分支与普通消息分叉。生成协议类型、历史兼容回退和仍被 app-server 使用的接口保留。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:stage`、`pnpm protocol:generate`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm desktop:build`、`pnpm desktop:package`。
- 已知问题：本机 `pnpm quality:knip` 在 OXC 解析阶段因 `Array buffer allocation failed` 中止，未产生诊断，因此不能宣称 Knip 门禁通过；这不是源码未使用结论。安装包尚未代码签名，仍缺 CI、干净机器 UAC/sidecar 验证，以及超长活动输出和三栏拖拽的自动化覆盖。Vite 仍报告主 chunk 超过 500 kB。
- 下一步：在稳定的 Node/OXC 运行环境复验 Knip；再配置不含密钥的 CI 基线、签名 NSIS 安装包，并在干净 Windows 环境验证安装后的动态 sidecar 路径。
- 验证证据：2026-09-02；`pnpm lint`、`pnpm typecheck`、`pnpm test -- --run`（57 个文件/261 个测试）、`pnpm build`、`pnpm rust:check`（14 个 Rust 单测及 Clippy）通过。`pnpm quality:knip` 因 OXC ArrayBuffer 分配失败退出，未修改仓库；生产构建成功，主 JS chunk 约 581.54 kB 并保留既有 bundle size warning。
- 最后更新：2026-09-02
