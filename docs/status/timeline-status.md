# 任务时间线状态

- 消息编辑：末回合结束后可替换其单条用户输入，发送前 thread/revert 回退分页历史，仅明确不支持分页时用 thread/rollback；取消不改历史、回退失败保留草稿、不撤销文件修改。多用户输入回合不支持单条替换。用户时间为 YYYY/MM/DD HH:mm，正文 14px，支持复制。2026-09-10 定向测试通过，真实 Runtime 编辑链路和对应四视口验收尚未完成。
- 资源展示：完成 Turn 汇总图片（含 SVG）、PDF 与表格；普通代码仅保留文件变更折叠区。跳转行为见 [Diff 状态](diff-status.md)。
- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；最近 200 个 Turn 直接挂载在单一原生滚动容器中，避免虚拟列表测量与滚动控制互相竞争。
- 最近变更：历史适配按降序收集最新 200 轮后恢复时间顺序，修复打开长 Session 取到最早 200 轮的问题。上下文压缩只消费 canonical contextCompaction Item，不再监听上游废弃的 thread/compacted；原有滚动、折叠、消息编辑行为不变。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；自动审批通知由 Core 标记为不稳定协议，因此 UI 只依赖最小摘要字段；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志的局部截断/虚拟化，补消息编辑真实 Runtime 验收。
- 验证证据：DOM 测试覆盖稳定初始底部、历史消息定位、返回最新、完成态不抢回底部、运行中仅在跟随模式贴底、重复历史滚动不跳动、新活动提示、底部 settle 后恢复跟随、Session 切换重置和消息轨同步；reducer 测试继续覆盖自动审查合并、延迟 started 不倒退、终端 stdin 脱敏、有界过程事件与 Turn 裁剪。
- 最后更新：2026-09-11
