# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：运行中过程标题改为“正在处理”，从 Turn 开始到完成每秒刷新耗时，完成后冻结最终值。计时优先使用 app-server `Turn.startedAt`、`Turn.completedAt`、`Turn.durationMs` 和 `item/started.startedAtMs`；固定 Runtime 缺失时间字段时，才使用 Shell 发起请求或接收生命周期通知的本地时间回退，后续空字段不会覆盖已知时间。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖本地开始/完成时间回退、通知与响应竞态、完整附件 optimistic Item、服务端 Item 替换、命令/Plan delta、MCP progress、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；DOM 定时器测试覆盖运行中逐秒更新、完成态冻结及卸载清理。
- 最后更新：2026-08-14
