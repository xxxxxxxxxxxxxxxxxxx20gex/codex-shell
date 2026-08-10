# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：真实多轮、P0 工作区/线程管理、多 Thread 并行、Token 用量、原生 Item 中间态、稳定智能体命令与 scoped experimental Plan 已接入。
- 最近变更：新增原生 `item/plan/delta` 与 `item/mcpToolCall/progress` 订阅；Item 的 started/completed 生命周期驱动对话区实时活动状态，app-server 停止或 Turn 完成时自动清理瞬时状态。默认 Turn 继续保持稳定 `turn/start` 请求结构。
- 当前接口：除基础连接与 turn 方法外，提供线程分页、目录/文件、Skills、MCP 状态、Token 用量、上下文压缩、长期目标、Item 生命周期、Plan/MCP/推理/命令/Patch 流式活动和 Diff 通知适配。
- 已知问题：尚未实现自动断线重连和请求级取消。
- 下一步：增加断线恢复策略，并覆盖更多真实反向请求类型。
- 验证证据：客户端测试覆盖 6 个稳定命令 RPC、experimental initialize 能力、Plan Turn 精确请求体，以及默认 Turn 不携带实验字段；真实 app-server Plan smoke、Skills/MCP 列表和 Goal 生命周期 smoke 均通过。
- 最后更新：2026-08-10
