# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：参考 Codex 桌面端，将同一 Turn 的 commentary、reasoning、命令和工具事件按 app-server 原始顺序归并到可折叠“执行过程”；同一连续过程达到 2 项时默认折叠。运行中普通后续消息现在进入独立的下一 Turn 队列，前一 Turn 的最终回答完整落盘后才自动发送；只有显式 Steer 输入仍作为同一 Turn 的 `userMessage` 按原始 Item 位置切分执行过程。左侧消息轨道在普通浏览时按视口顶部 Turn 跟踪，滚动到底时同步到最后一条用户消息。最终回答使用安全 Markdown/GFM 渲染，原生 `fileChange` 仍在回答末尾汇总。`turn/completed` 携带完整 Items 时作为权威快照，清除流式阶段残留。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖命令/Plan delta、MCP progress、Item 生命周期、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；Hook 与 DOM 测试覆盖完成后启动下一 Turn、跨 Session 队列隔离、中断后暂停和继续、显式 steer 用户消息顺序、滚动到底后轨道同步最后消息、空 reasoning 隐藏、过程折叠、安全 Markdown、消息轨道、命令折叠、文件汇总、回答复制/分叉和智能跟随。
- 最后更新：2026-08-13
