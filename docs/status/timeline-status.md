# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：修复运行中时间线滚到底部后回弹、无法稳定看到最后消息的问题；虚拟化 Turn 的纵向间隔全部放入可测量的 padding，流式内容高度变化复用 Virtuoso 原生底部跟随，用户主动上滑后则保留历史阅读位置。历史回答末尾的分叉动作也已恢复，每个可分叉 Turn 都传递自己的 Turn ID，最新 Turn 执行中不会隐藏之前已完成回答的分叉入口。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖本地开始/完成时间回退、通知与响应竞态、完整附件 optimistic Item、服务端 Item 替换、命令/Plan delta、MCP progress、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；DOM 测试覆盖运行中逐秒更新、完成态冻结、流式高度增长继续贴底、布局校正不误停、用户主动上滑停止跟随及卸载清理。
- 最后更新：2026-08-17
