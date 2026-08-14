# Codex Shell 项目约束

## 项目目标

Codex Shell 是面向个人开发者的 Windows 桌面智能体工作台。产品使用 Tauri 2、React、TypeScript 与 Rust 构建，以随产品固定版本发布的原版 `codex app-server` 为执行核心，通过 stdio JSON-RPC 通信，不修改 Codex Core。

## 架构边界

- React 负责工作台视图、交互状态和 app-server v2 协议适配。
- Tauri/Rust 负责进程生命周期、本地配置、Windows Credential Manager 和系统能力。
- `codex app-server` 是唯一智能体执行核心；stdout 只承载协议消息，stderr 只承载日志。
- API Key 不得写入源码、日志、状态文档或普通配置文件，也不得通过 Tauri 命令回读到前端。
- 模型 ID 与模型参数必须解耦。优先使用 app-server 原生模型元数据决定可选参数；第三方模型的专属参数应限制在高级 Provider 适配层，不得硬编码到通用对话流程。
- 默认只使用稳定 app-server v2 API；实验字段必须由明确的产品需求驱动，限制在最小协议适配层内，并同时提供能力声明、序列化测试和真实 app-server 验证证据。

## 代码改动规范

- 核心模块保持单一职责；跨模块数据使用显式类型，不通过任意对象隐式传递。
- 新增 app-server 方法时，先更新生成协议类型，再在协议客户端增加适配。
- UI 不得直接管理子进程或密钥；所有系统能力必须经过最小化 Tauri 命令。
- 项目路径不得写死开发机盘符、用户名或仓库位置；运行时使用 Tauri 路径 API、`current_exe`、环境变量和 PATH，脚本使用 `$PSScriptRoot` 拼接，并在使用候选路径前验证文件存在。
- 不在高频入口文件堆积业务逻辑；超过约 500 行时优先拆分模块。
- 用户可见行为必须有对应测试或可复现的验证证据。
- 提交前至少运行 `pnpm typecheck`、`pnpm build` 和 `cargo check --manifest-path src-tauri/Cargo.toml`。

## 阶段性代码健康审查

- 每完成一个可独立交付的里程碑，或连续落地约 3–5 个功能提交后，进行一次保持现有行为的代码健康审查；清理应使用独立提交，避免与新功能混在一起。
- 审查必须覆盖：未使用文件/导出/依赖、失效功能分支、重复状态与重复请求、可合并的错误/路径/生命周期逻辑、事件监听与定时器释放、列表和缓存硬上限、测试及状态文档漂移。
- 优先复用 app-server v2、Codex Core 和 Tauri 已有能力。新增包装层、Hook 或工具函数前，必须确认现有抽象无法直接满足需求；只被调用一次且不能形成清晰职责边界的小包装不应保留。
- `App`、Session 编排和 Runtime 生命周期入口只负责协调。单个手写 TypeScript/Rust 模块目标不超过约 500 行；接近上限时，新功能应先拆到按职责命名的模块。超过约 800 行必须拆分，不以压缩格式或超长单行规避统计。
- 删除代码前先证明没有调用方、持久化兼容或协议依赖；不得为了“整洁”删除生成协议、历史 Session/rollout 兼容、迁移逻辑或仍由 app-server 使用的稳定接口。
- 审查先用静态证据定位问题，再做最小安全修改。前端至少运行 TypeScript、Vitest、production build 和 Knip；Rust 变更至少运行 Cargo check、相关单元测试和 Clippy。用户可见行为或生命周期修复必须补对应测试。
- 审查结论同步到相关 `docs/status/*.md`：记录已删除的冗余、仍保留的风险和验证证据，不记录仅有主观偏好的格式调整。

## 动态文档更新门禁

- 模块行为、接口或数据流发生变化时，必须在同一提交更新对应模块状态文档。
- 跨模块里程碑、范围或发布状态变化时，必须更新 `PROJECT_STATUS.md`。
- `PROJECT_STATUS.md` 只保存跨模块当前快照、风险、下一里程碑和验证基线；新状态应替换失效描述，不得把每日“已完成”持续追加成历史流水账，历史由 Git 保留。
- 模块状态文档中的“最近变更”只描述当前实现的最近一次行为变化，不记录个人凭据条目、临时排障过程或已被后续设计替代的旧入口。
- 验证证据只能记录在当前代码基线上实际执行并取得明确结果的命令；源码中存在测试不等于测试已通过，超时或环境失败必须与断言失败分开描述。
- 每次功能改动完成前必须按本索引逐项检查受影响模块，不能只更新 `PROJECT_STATUS.md`；测试数量、构建结果和已知问题也必须同步到对应状态文档。
- 动态文档使用中文，日期采用 `YYYY-MM-DD`，不得记录密钥和个人隐私。
- 本文件只保存长期规则与索引，不记录每日进展。

## Git 交付约定

- 一个用户要求的改动完成并通过对应验证后，默认直接提交并推送当前分支，不再等待额外的 push 确认；用户明确要求只保留本地改动时除外。
- GitHub HTTPS 认证使用 GitHub CLI 的非交互凭据助手，不触发 Git Credential Manager 图形窗口；凭据只保存在用户级安全存储中，不得写入仓库、脚本、文档、提交信息或远端 URL。
- 本机网络访问 GitHub 时使用 `http://127.0.0.1:7897` 代理；只把代理作为本仓库 Git 配置，不将代理环境注入应用运行时。
- 推送失败时先报告可复现的认证、网络或远端拒绝原因，不得在命令输出或日志中打印 PAT。

## 动态状态文档索引

- [项目总状态](docs/status/PROJECT_STATUS.md)
- [Codex Runtime](docs/status/runtime-status.md)
- [app-server 客户端](docs/status/app-server-client-status.md)
- [协议与生成类型](docs/status/protocol-status.md)
- [凭据安全](docs/status/credentials-status.md)
- [模型配置](docs/status/model-config-status.md)
- [工作区与线程](docs/status/workspace-thread-status.md)
- [智能体命令与扩展能力](docs/status/agent-capabilities-status.md)
- [任务时间线](docs/status/timeline-status.md)
- [审批](docs/status/approvals-status.md)
- [Diff 与文件变更](docs/status/diff-status.md)
- [桌面 UI 壳](docs/status/ui-shell-status.md)
- [测试与发布](docs/status/testing-release-status.md)
