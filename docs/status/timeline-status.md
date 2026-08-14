# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：用户消息现从 app-server `userMessage.content` 还原附件：`localImage`/`image` 显示缩略图，带 `text_elements` 的本地路径显示文件卡片，并从可见消息气泡隐藏内部 `Attached files:` 路径块。发送后的 optimistic Item 保存完整 `UserInput[]`，因此附件在请求提交后立即可见，等服务端持久化 Item 到达时再由原有合并逻辑替换，不会出现预览闪烁或串 Turn。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖完整附件 optimistic Item、服务端 Item 替换、命令/Plan delta、MCP progress、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；DOM 测试覆盖图片/文件卡片、文本和图片预览、历史附件还原、仅附件消息及旧绝对路径 mention 兼容。
- 最后更新：2026-08-14
