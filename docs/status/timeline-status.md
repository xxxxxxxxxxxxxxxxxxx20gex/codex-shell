# 任务时间线状态

- 模块职责：把用户消息、智能体消息、计划、工具、命令和错误归一化为结构化多轮时间线。
- 当前状态：消息、计划、推理、命令、文件、MCP、动态工具、搜索、图片与子智能体活动均已进入连续的结构化多轮时间线；长 Session 使用可变高度视口虚拟化，只挂载可见 Turn。
- 最近变更：修复运行中拖动原生滚动条时与自动贴底竞争造成的上下弹跳：关闭 Virtuoso 内置 `followOutput`（包括其 `SIZE_INCREASED` 尺寸变化自动贴底路径），由受保护的自有贴底 effect 统一控制；Virtuoso `isScrolling` 生命周期、指针滚动和可信的向上 scroll 事件共同锁定用户滚动，拖动期间即使虚拟列表短暂报告到底也不恢复，释放后仅在真实底部恢复；同时补充 `lostpointercapture`、`mouseup`、窗口失焦兜底，避免漏发 pointerup 后永久停留在拖动态。自动审批和终端交互仍沿用现有 Turn 活动区与完成后折叠逻辑。
- 当前接口：`agentSessionReducer`、`ConversationTimeline`、`ConversationTurn`、`TurnActivityGroup`、`TurnActivityItem`、`MarkdownContent`、`TurnFileChanges`、`TurnPlanView`。
- 已知问题：MCP/动态工具的结构化结果仍以安全截断 JSON 展示；自动审批通知由 Core 标记为不稳定协议，因此 UI 只依赖最小摘要字段；尚未提供活动类型过滤。
- 下一步：增加活动筛选、单个超长命令日志虚拟化和文件变更详情跳转。
- 验证证据：DOM 测试覆盖流式贴底、主动上滑停止跟随、滚动条向下拖动暂停跟随、无 pointer 事件的可信原生 scroll 停止跟随、Virtuoso 尺寸变化跟随关闭、`isScrolling` 原生拖动生命周期、原生拖动通过 mouseup/失焦恢复、完成态折叠及卸载清理；reducer 测试继续覆盖自动审查合并、延迟 started 不倒退、终端 stdin 脱敏、有界过程事件与 Turn 裁剪。
- 最后更新：2026-08-21
