# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；最近 200 个 Turn 直接挂载在单一原生滚动容器中，避免虚拟列表测量与滚动控制互相竞争。
- 最近变更：重构时间线滚动控制：移除 Virtuoso 及其 `followOutput`、`isScrolling`、`atBottomStateChange` 多源滚动状态，改为单一原生容器和显式滚动策略。程序定位只通过一次 `scrollTop/scrollTo({ behavior: "auto" })` 完成；用户 scroll 会进入短暂 settle 锁，锁定期间任何消息更新都不能抢回视口；只有用户在底部稳定后或明确点击“返回最新”才恢复流式跟随。切换 Session 会重置滚动策略并定位新会话底部，已完成历史不会触发自动滚动。自动审批和终端交互仍沿用现有 Turn 活动区与完成后折叠逻辑。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；自动审批通知由 Core 标记为不稳定协议，因此 UI 只依赖最小摘要字段；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志的局部截断/虚拟化和文件变更详情跳转。
- 验证证据：DOM 测试覆盖稳定初始底部、历史消息定位、返回最新、完成态不抢回底部、运行中仅在跟随模式贴底、重复历史滚动不跳动、新活动提示、底部 settle 后恢复跟随、Session 切换重置和消息轨同步；reducer 测试继续覆盖自动审查合并、延迟 started 不倒退、终端 stdin 脱敏、有界过程事件与 Turn 裁剪。
- 最后更新：2026-08-21
