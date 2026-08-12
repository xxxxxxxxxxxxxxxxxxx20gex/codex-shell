# 审批状态

- 模块职责：接收 app-server 反向请求并让用户批准或拒绝 Shell、文件和权限操作。
- 当前状态：三类审批、工具结构化问答与 MCP elicitation 已统一进入一个 Server Interaction Queue；新启动的 UI 默认使用“完全访问权限”。
- 最近变更：默认权限模式改为 `full`，对应 app-server 的 `approvalPolicy=never` 与 `sandbox=danger-full-access`；用户仍可在输入框工具栏切换为请求批准或自动审查。该默认值按产品要求减少审批中断，但会绕过工作区沙盒边界并允许访问本机文件和网络。
- 当前接口：`ServerInteractionStore`、`ServerInteractionDialog`、`PermissionModeSelector` 和 `onReverseRequest`。
- 已知问题：审批结果尚未作为独立时间线 item 展示；队列暂不显示每项来源 Session 的跳转入口。
- 下一步：增加来源 Session 定位和更友好的日期、日期时间等专用输入控件。
- 验证证据：Store 和 happy-dom 测试覆盖响应形状、服务端撤销、清空、有界队列、多选数组、可选字段省略、schema 约束与不安全 URL；新增默认权限测试断言 `full → never + danger-full-access`；JSON-RPC 测试覆盖真实 request ID 和 dismiss 后不发响应。
- 最后更新：2026-08-12
