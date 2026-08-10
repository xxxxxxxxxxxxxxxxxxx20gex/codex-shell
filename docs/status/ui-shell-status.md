# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏编程智能体工作台已接入真实工作区、完整执行时间线、Diff 审查和多 Session 并行交互。
- 最近变更：右侧日志页改为通过 `useSyncExternalStore` 订阅独立有界 Store，关闭日志页时不再因 stderr 批次刷新整个 `App` 和对话时间线；日志样式与三栏缩放生命周期分别迁移到 feature CSS 和 `useResizablePanels`，`App` 从 493 行降至约 456 行。Session 二次确认继续保留。
- 当前接口：`App`、可调整三栏工作区、`StatusInspector`、`RuntimeLogPanel`、`CodexHomeCard`、`ContextHeatBar`、`SessionActionConfirmDialog`、工作区浏览器、slash/Skill/MCP/Goal 面板、线程时间线、Diff、设置和审批组件。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器；`App.css` 仍集中承载多个 feature 的样式，后续应随功能改动逐块迁移，避免继续扩大共享样式耦合。
- 下一步：补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：17 个 Vitest 文件共 71 项测试、TypeScript 检查、生产构建与 Knip 通过；日志 Store 测试覆盖批量发布、取消、退订和清空，面板测试覆盖敏感提示和错误级别，Session、CODEX_HOME 和分栏测试继续通过。
- 最后更新：2026-08-10
