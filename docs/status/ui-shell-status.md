# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏编程智能体工作台已接入真实工作区、完整执行时间线、Diff 审查和多 Session 并行交互。
- 最近变更：对话框左侧新增蓝到红的竖向上下文热力条；悬停显示当前上下文、模型窗口和 Session 累计 Token，点击调用 app-server 手动压缩；任务运行时禁用。代码审查统一了热力条与 `/compact` 的执行和错误处理路径，并合并重复的输入框 CSS 规则。
- 当前接口：`App`、`ContextHeatBar`、工作区浏览器、slash/Skill/MCP/Goal 面板、线程时间线、Diff、设置和审批组件。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器。
- 下一步：补齐文件/会话键盘导航、无障碍状态播报和可调三栏宽度。
- 验证证据：10 个 Vitest 文件共 41 项测试、TypeScript 检查、Vite production build 与 Tauri debug build 通过。
- 最后更新：2026-08-07
