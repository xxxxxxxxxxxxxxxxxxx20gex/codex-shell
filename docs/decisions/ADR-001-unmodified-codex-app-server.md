# ADR-001：使用原版 Codex app-server 作为唯一执行核心

- 状态：superseded by [ADR-003](ADR-003-compatible-runtime-updates.md)
- 记录日期：2026-08-21
- 影响范围：Runtime、协议客户端、前后端职责边界

## 背景

Codex Shell 需要在 Windows 桌面产品中提供 Codex 的 Thread、Turn、工具、审批和扩展能力，同时保持与上游 Runtime 的行为和协议一致。

## 决策

使用原版 `codex app-server` 作为唯一智能体执行核心，通过 stdio JSON-RPC 通信，不修改 Codex Core。发布包会记录实际 Runtime 版本和哈希；同源 Runtime 的更新通过兼容性门禁后可以进入开发/打包流程。React 负责工作台和协议展示，Tauri/Rust 负责进程生命周期、本地配置、凭据和系统能力。

## 选择理由与未采用方案

该边界可以复用上游能力、生成协议类型和 Runtime 行为，减少 Shell 与 Core 形成两套执行语义。项目不采用维护 Codex Core 私有分支或在前端复制 Agent 执行循环的方案，因为这会扩大升级、兼容和安全验证成本。

## 后果

- Runtime 与 companion binaries 必须从同一目录成套暂存并校验哈希；更新时必须通过现有方法、通知、反向请求和协议生成检查。发现已使用类型或调用面发生不兼容变化时，必须先重新生成协议、审查差异并回归测试。
- 新能力优先复用稳定 app-server v2 API；实验能力只能保留在最小适配层，并提供能力声明和真实 Runtime 证据。
- UI 不直接管理子进程，也不通过自建流程替代 Core 已提供的 Thread、Goal、Plan、Review 或压缩能力。
- 上游暂未提供稳定接口的功能，需要等待、限制范围或明确设计适配层，不能通过修改 Core 绕过边界。

## 关联状态文档

- [Codex Runtime](../status/runtime-status.md)
- [app-server 客户端](../status/app-server-client-status.md)
- [协议与生成类型](../status/protocol-status.md)
