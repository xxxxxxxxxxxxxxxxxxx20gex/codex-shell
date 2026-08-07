# 审批状态

- 模块职责：接收 app-server 反向请求并让用户批准或拒绝 Shell、文件和权限操作。
- 当前状态：三类反向审批、三档会话权限模式和审批队列已接入。
- 最近变更：权限模式选择器移入输入框单行工具栏，与 `/` 命令和模型入口并排，不再单独占用一行；反向审批弹窗和全局队列行为不变。
- 当前接口：`PendingApproval`、`ApprovalDialog`、`PermissionModeSelector`、`PermissionModeConfig`、`enqueueApproval`、`approve`、`decline`、`onReverseRequest`。
- 已知问题：尚未接入 MCP elicitation、工具问答和审批倒计时；真实审批结果尚未作为独立时间线 item 展示。
- 下一步：补充审批队列 reducer 测试并接入 MCP/工具问答。
- 验证证据：类型检查通过；反向请求由队列持有，不再使用可被覆盖的单 resolver。
- 最后更新：2026-08-07
