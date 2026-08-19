# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：Markdown fenced code 已升级为可固定识别的语言标题栏、复制操作和独立代码正文，无语言标记时显示“纯文本”，行内代码继续保持行内语义；助手正文使用独立的高可读对话色。完成态时间线会把 app-server 在初始用户消息前产生的预采样活动（例如模型切换兼容压缩）展示到该用户消息之后，恢复“用户输入 → 中间过程 → 模型回答”的对话语义；仅重排 `clientId=null` 的初始消息前导 Activity，Steer 中途消息继续保持原生顺序。底部跟随与历史回答分叉行为保持不变。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：reducer 测试覆盖本地开始/完成时间回退、通知与响应竞态、完整附件 optimistic Item、服务端 Item 替换、命令/Plan delta、MCP progress、完整完成态清除流式残留、实时 Diff、历史文件变更重建和有界历史；DOM 测试覆盖预采样压缩的语义顺序、Steer 原生顺序、运行中逐秒更新、完成态冻结、流式高度增长继续贴底、用户主动上滑停止跟随及卸载清理。
- 最后更新：2026-08-19
