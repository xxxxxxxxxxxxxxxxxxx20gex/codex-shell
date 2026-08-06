# Codex Shell 项目约束

## 项目目标

Codex Shell 是面向个人开发者的 Windows 桌面智能体工作台。产品使用 Tauri 2、React、TypeScript 与 Rust 构建，以随产品固定版本发布的原版 `codex app-server` 为执行核心，通过 stdio JSON-RPC 通信，不修改 Codex Core。

## 架构边界

- React 负责工作台视图、交互状态和 app-server v2 协议适配。
- Tauri/Rust 负责进程生命周期、本地配置、Windows Credential Manager 和系统能力。
- `codex app-server` 是唯一智能体执行核心；stdout 只承载协议消息，stderr 只承载日志。
- API Key 不得写入源码、日志、状态文档或普通配置文件，也不得通过 Tauri 命令回读到前端。
- 模型 ID 与能力模板必须解耦。只有模板明确声明支持的参数才可发送给模型。
- 首版只使用稳定 app-server v2 API，不启用实验 API。

## 代码改动规范

- 核心模块保持单一职责；跨模块数据使用显式类型，不通过任意对象隐式传递。
- 新增 app-server 方法时，先更新生成协议类型，再在协议客户端增加适配。
- UI 不得直接管理子进程或密钥；所有系统能力必须经过最小化 Tauri 命令。
- 不在高频入口文件堆积业务逻辑；超过约 500 行时优先拆分模块。
- 用户可见行为必须有对应测试或可复现的验证证据。
- 提交前至少运行 `pnpm typecheck`、`pnpm build` 和 `cargo check --manifest-path src-tauri/Cargo.toml`。

## 动态文档更新门禁

- 模块行为、接口或数据流发生变化时，必须在同一提交更新对应模块状态文档。
- 跨模块里程碑、范围或发布状态变化时，必须更新 `PROJECT_STATUS.md`。
- 动态文档使用中文，日期采用 `YYYY-MM-DD`，不得记录密钥和个人隐私。
- 本文件只保存长期规则与索引，不记录每日进展。

## 动态状态文档索引

- [项目总状态](docs/status/PROJECT_STATUS.md)
- [Codex Runtime](docs/status/runtime-status.md)
- [app-server 客户端](docs/status/app-server-client-status.md)
- [协议与生成类型](docs/status/protocol-status.md)
- [凭据安全](docs/status/credentials-status.md)
- [模型配置](docs/status/model-config-status.md)
- [工作区与线程](docs/status/workspace-thread-status.md)
- [任务时间线](docs/status/timeline-status.md)
- [审批](docs/status/approvals-status.md)
- [Diff 与文件变更](docs/status/diff-status.md)
- [桌面 UI 壳](docs/status/ui-shell-status.md)
- [测试与发布](docs/status/testing-release-status.md)
