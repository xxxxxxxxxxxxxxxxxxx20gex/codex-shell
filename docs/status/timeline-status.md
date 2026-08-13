# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：参考 Codex 桌面端，将同一 Turn 的原生 commentary 直接显示为连续过程正文，reasoning 使用低强调过程文字；连续原生 `commandExecution` 项收进默认折叠的命令抽屉，展开后保留每个命令的状态、耗时、输出和退出码，原生 `fileChange` 仍在回答末尾汇总；过程头在运行时基于 app-server `Turn.startedAt` 每秒显示已处理时长，完成后切换为原生 `Turn.durationMs`，不生成推测性过程内容。运行中普通后续消息进入独立的下一 Turn 队列，发送按钮悬停菜单可在 Queue（等待完成）和 Steer（原生引导）之间选择，队列条目也可直接转为 Steer；只有显式 Steer 输入仍按原始 Item 位置切分同一 Turn。消息轨道点击不再根据最后一条索引推断已经滚到底，只有虚拟列表实际抵达底部才恢复流式自动跟随，避免展开运行项后视口跳回旧位置。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖命令/Plan delta、MCP progress、Item 生命周期、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；Hook 与 DOM 测试覆盖完成后启动下一 Turn、跨 Session 队列隔离、队列条目转 Steer 所需的原生 steer 生命周期、中断后暂停和继续、显式 steer 用户消息顺序、滚动到底后轨道同步最后消息、最后一轮导航不误恢复自动跟随、Steer 分段运行状态、空 reasoning 隐藏、安全 Markdown、连续过程流、命令抽屉聚合与默认折叠、文件汇总、回答复制/分叉和智能跟随。
- 最后更新：2026-08-13
