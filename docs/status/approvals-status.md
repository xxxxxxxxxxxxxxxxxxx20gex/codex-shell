# 审批状态

- 模块职责：接收 app-server 反向请求并让用户批准或拒绝 Shell、文件和权限操作。
- 当前状态：三类审批、工具结构化问答与 MCP elicitation 已统一进入一个 Server Interaction Queue；新启动的 UI 默认使用“完全访问”。
- 最近变更：主权限仍原生映射只读、工作区写入、完全访问三档；新增消费 `autoApprovalReview` started/completed 中间态。前端只保留审查 ID、状态、风险、目标 Item 和时间，不扩散 Core 标记为不稳定的完整 action/rationale 结构；Reducer 对延迟的 started 通知保持 completed 单调状态，避免审查结果倒退。
- 当前接口：`ServerInteractionStore`、`ServerInteractionDialog`、`PermissionModeSelector` 和 `onReverseRequest`。
- 已知问题：自动审批只作为 Turn 中间过程摘要展示，不作为可审计的持久化审批记录；队列暂不显示每项来源 Session 的跳转入口。
- 下一步：增加来源 Session 定位和更友好的日期、日期时间等专用输入控件。
- 验证证据：Store 和 happy-dom 测试继续覆盖反向审批队列；新增订阅和 reducer 测试覆盖非当前 Session 隔离、重复 started 去重、completed 合并及缺失 started 的容错。
- 最后更新：2026-08-21
