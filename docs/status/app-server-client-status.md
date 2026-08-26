# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：补齐兼容门禁 Runtime 新增的 `thread/settings/updated`、`thread/goal/updated|cleared`、`item/autoApprovalReview/started|completed` 和 `item/commandExecution/terminalInteraction` 通知订阅；Thread 权威状态按 ID 隔离，Composer 与设置逻辑读取 Core 的模型、推理、服务层级、权限和审批者状态，Goal 在打开 Session 时通过原生 get RPC 补齐；执行过程通知按 Thread ID 路由，主会话和 ephemeral 侧边聊天分别消费各自 reducer，避免后台或侧聊串流到主窗口；侧聊关闭时在现有连接可用的情况下复用原生 `turn/interrupt` 后再调用 `thread/unsubscribe`，Runtime 已停止时不为清理动作重新启动进程。
- 当前接口：基础连接、带代际的 Tauri Transport、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过兼容门禁 Runtime 的生成类型适配；侧边聊天复用 `thread/fork`/`thread/start`、`turn/start` 和同一连接，不增加自定义 app-server 方法。附件预览按需复用稳定 `fs/readFile`，没有增加自定义 app-server 方法或通用 file-attachment 变体。
- 已知问题：尚未实现自动断线重连和请求级取消。低优先级 Account、Plugin/App Marketplace、Hooks、Realtime 和 Feedback 仍未接入。
- 下一步：优先增加断线后的可控恢复；再评估 Plugin/Apps 和 Hooks，避免为个人第三方网关产品引入无用的 OpenAI 账户面板。
- 验证证据：订阅测试覆盖 Thread settings/Goal 权威通知、非当前 Thread 的自动审查与终端交互过滤、当前 Thread 分发、主/侧聊天 delta 隔离和 `thread/section/move` 请求体；真实工具探针已确认 Code Mode Host 产生两次 `commandExecution`。所有探针只从环境接收凭据且不输出密钥。
- 相关决策：[ADR-001：使用原版 Codex app-server](../decisions/ADR-001-unmodified-codex-app-server.md)。
- 最后更新：2026-08-24
