# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入结构化多轮时间线，并显示当前正在执行的原生 Item 中间态。
- 最近变更：对话区通过 `item/started`/`item/completed` 显示“正在分析、执行命令、修改文件、调用 MCP、协调子智能体”等状态，活动中的卡片自动展开；Plan delta 和 MCP progress 实时更新，完成后以最终 Item 为准。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`TurnActivityItem`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、复制输出和长命令日志虚拟化。
- 验证证据：reducer 测试覆盖命令/Plan delta、MCP progress、Item 生命周期、实时 Diff、历史文件变更重建和有界历史；静态 React 测试确认活动状态、原生进度消息和进行中提示进入对话窗口。
- 最后更新：2026-08-10
