# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：真实多轮、P0 工作区/线程管理、多 Thread 并行、Token 用量和稳定智能体命令已接入。
- 最近变更：消费稳定 `thread/tokenUsage/updated`，保存 app-server 上报的当前上下文、Session 累计用量与模型上下文窗口；保留 `thread/compact/start` 手动压缩入口。代码审查删除了未调用的通用 `notify`、`thread/read` 包装和未消费的审批计数，并把仅模块内部使用的协议处理类型收窄为私有。
- 当前接口：除基础连接与 turn 方法外，提供线程分页、目录/文件、Skills、MCP 状态、Token 用量、上下文压缩、长期目标、实时活动和 Diff 通知适配。
- 已知问题：尚未实现自动断线重连和请求级取消。
- 下一步：增加断线恢复策略，并覆盖更多真实反向请求类型。
- 验证证据：严格 TypeScript 未使用检查和 Knip 手写导出/依赖/循环依赖检查通过；客户端测试覆盖 6 个稳定命令 RPC；Session reducer 覆盖 Token 通知状态；真实 app-server Skills/MCP 列表和 Goal 生命周期 smoke 通过。
- 最后更新：2026-08-07
