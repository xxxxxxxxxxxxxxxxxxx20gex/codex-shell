# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：Turn 从发送成功起即复用同一个“正在处理 + 实时耗时”活动头；空的流式 `agentMessage` 不再生成“正在等待模型响应/生成中”伪回答，首个可见活动到达时只在同一结构内追加原生推理、命令或工具内容，真实回答到达后才渲染回答标记与正文。Markdown fenced code 继续提供语言标题、复制操作和独立代码正文；初始用户消息前的预采样活动按对话语义展示到用户消息之后，Steer 中途消息保持原生顺序。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖本地开始/完成时间回退、通知与响应竞态、完整附件 optimistic Item、服务端 Item 替换、命令/Plan delta、MCP progress、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；DOM 测试覆盖发送后的空活动统一状态、首个活动到达、预采样压缩语义顺序、Steer 原生顺序、运行中逐秒更新、完成态冻结、流式高度增长继续贴底、用户主动上滑停止跟随及卸载清理。
- 最后更新：2026-08-19
