# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入结构化多轮时间线。
- 最近变更：reducer 累积 `item/commandExecution/outputDelta`、reasoning delta、file patch、Turn plan 与完整 Diff；实时 delta 只更新当前打开的 Session，后台 Session 保持运行生命周期，切回时从 `thread/resume` 的完整 Thread 快照恢复。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`TurnActivityItem`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、复制输出和长命令日志虚拟化。
- 验证证据：reducer 测试覆盖命令 delta、实时 Diff 和历史文件变更重建；静态 React 测试确认命令活动不再被隐藏；全部 Vitest 通过。
- 最后更新：2026-08-07
