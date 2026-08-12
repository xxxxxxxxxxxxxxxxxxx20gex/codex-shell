# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：参考 Codex 桌面端，将同一 Turn 的 commentary、reasoning、命令和工具事件按 app-server 原始顺序归并到单个“执行过程”区域；运行时自动展开并显示当前活动或 MCP progress，完成后自动收起，失败项保持展开。最终回答与过程信息分离并使用安全 Markdown/GFM 渲染，禁用原始 HTML；原生 `fileChange` 仍在回答末尾汇总。`turn/completed` 携带完整 Items 时改为权威快照，清除仅存在于流式阶段的旧 Item，避免已完成命令残留为 `inProgress`。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖命令/Plan delta、MCP progress、Item 生命周期、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；静态及 happy-dom 测试覆盖执行过程归并与顺序、活动状态中文化、安全 Markdown、单一助手强调线、命令折叠、回答末尾文件汇总、回答复制/分叉、用户消息跳转、离底后不强制跟随和新内容提示。
- 最后更新：2026-08-12
