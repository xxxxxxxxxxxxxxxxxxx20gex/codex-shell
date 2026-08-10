# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏编程智能体工作台已接入真实工作区、完整执行时间线、Diff 审查和多 Session 并行交互。
- 最近变更：右侧检查器新增“日志”页，展示本次运行收到的 app-server stderr、接收时间和错误级别，可手动清空并明确提示敏感数据边界；原状态内容抽离为 `StatusInspector`，核心 `App` 保持在 500 行以内。Session 二次确认继续保留。
- 当前接口：`App`、可调整三栏工作区、`StatusInspector`、`RuntimeLogPanel`、`CodexHomeCard`、`ContextHeatBar`、`SessionActionConfirmDialog`、工作区浏览器、slash/Skill/MCP/Goal 面板、线程时间线、Diff、设置和审批组件。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器。
- 下一步：补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：17 个 Vitest 文件共 67 项测试、TypeScript 检查、生产构建与 Knip 通过；日志面板测试覆盖敏感提示和错误级别，Session、CODEX_HOME 和分栏测试继续通过。
- 最后更新：2026-08-10
