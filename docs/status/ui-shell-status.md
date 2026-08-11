# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和工作区实时刷新。
- 最近变更：时间线加入长对话虚拟化、智能跟随、新内容按钮与用户消息导航轨；Diff 加入文件状态摘要和工作区查看入口。新增样式分别保存在 feature CSS，未继续堆积 `App.css`。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、slash/Skill/MCP/Goal/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器；`App.css` 仍集中承载多个 feature 的样式，后续应随功能改动逐块迁移，避免继续扩大共享样式耦合。
- 下一步：补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：统一交互、MCP、Review、模型设置和活动/归档 Session 均有 happy-dom 行为测试，运行提示有 Store 边界测试；完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-11
