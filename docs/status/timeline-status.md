# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：时间线开始消费自动审批审查生命周期和命令终端交互通知；不稳定审查协议被收敛为批准/拒绝、风险等级等安全摘要，终端交互只显示输入字符数，不保存或渲染原始 stdin。过程事件沿用现有 Turn 活动区和完成后折叠逻辑，不新增独立消息框。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；自动审批通知由 Core 标记为不稳定协议，因此 UI 只依赖最小摘要字段；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖自动审查 started→completed 原地合并、completed 缺少 started 时的容错、终端 stdin 脱敏、有界过程事件与 Turn 裁剪；渲染测试覆盖审查和终端交互摘要。既有 DOM 测试继续覆盖流式贴底、主动上滑停止跟随、完成态折叠及卸载清理。
- 最后更新：2026-08-20
