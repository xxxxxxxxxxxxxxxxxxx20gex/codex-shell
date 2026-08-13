# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：参考 Codex 桌面端，将同一 Turn 的 commentary、reasoning、命令和工具事件按 app-server 原始顺序归并到可折叠“执行过程”；同一连续过程达到 2 项时默认折叠为一条原生进度汇总，用户可手动展开且流式更新不会反复关闭，失败项自动展开。reasoning 的摘要与正文都没有可见字符时不再生成空的“分析过程”折叠项，但仍在 Item 活跃期间显示“正在分析问题”的即时进度。中途通过 `turn/steer` 追加的 `userMessage` 会切分前后过程并显示在真实 Item 位置，形成“初始消息 → 执行过程 → 用户补充 → 后续过程 → 最终回答”的连续结构。原右侧用户消息圆点导航升级为左侧连续消息轨道：每个用户 Turn 显示短刻度，当前可视 Turn 显示高亮长刻度，悬停查看摘要并可点击跳转，不引入动态编号。最终回答使用安全 Markdown/GFM 渲染，原生 `fileChange` 仍在回答末尾汇总。`turn/completed` 携带完整 Items 时作为权威快照，清除流式阶段残留。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖命令/Plan delta、MCP progress、Item 生命周期、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；静态及 happy-dom 测试覆盖空 reasoning 完成态隐藏及运行态进度保留、两项以上过程默认折叠、执行过程归并、steer 用户消息前后顺序、活动状态中文化、安全 Markdown、左侧消息轨道跳转与当前 Turn 高亮、单一助手强调线、命令折叠、回答末尾文件汇总、回答复制/分叉、离底后不强制跟随和新内容提示。
- 最后更新：2026-08-13
