# 桌面 UI 壳状态

- 模块职责：提供 Windows 三栏工作台、设置面板、主题与系统窗口交互；视觉契约以 [DESIGN.md](../../DESIGN.md) 为准。
- 当前状态：左栏管理 Session，中间承载对话或扩展管理页，右栏提供项目文件和只读侧边聊天。支持深色、浅色和跟随系统主题。历史行标题使用 14px Token，操作列在 hover/focus 时展开为 56px，不使用渐变遮罩。
- 最近变更：设置最小化状态由应用控制，最小化后点击左侧“设置”或右下角“恢复设置”均恢复同一个面板，保留当前分类、草稿和最大化状态，关闭后再次打开不会沿用隐藏状态。设置默认 1040×760 并受视口约束，不操作整个 Windows 窗口。渠道编辑独占内容区域；打开时聚焦面板，Tab 循环，最小化释放 Escape 监听。
- 当前接口：`App`、`WindowTitleBar`、`PreferencesPanel`、`useResizablePanels`、`WorkspaceExplorer`、`SideChatPanel`、`TransientNotice`。
- 布局边界：右侧详情共享 Inspector 生命周期；最大化保留左栏并收起对话列，恢复回到三栏。分隔线通过 CSS 变量及 requestAnimationFrame 更新，释放后同步状态。窗口自绘按钮不保证 Windows 11 Snap Layout 悬停菜单。
- 模块归属：渠道见 [模型配置](model-config-status.md)，消息与资源见 [时间线](timeline-status.md) 和 [Diff](diff-status.md)，Skills/MCP/Plugins 见 [扩展能力](agent-capabilities-status.md)，侧聊生命周期见 [项目与线程](workspace-thread-status.md)。
- 已知问题：文件/会话完整键盘导航、拖拽键盘调宽、队列与侧聊状态播报仍不完整；设置分类切换会卸载渠道编辑组件，草稿保留仅覆盖最小化/最大化，不覆盖切换分类或关闭。旧样式尚未全部收敛到设计契约。
- 下一步：优先修复渠道切换风险，再补齐键盘导航与状态播报。
- 验证证据：2026-09-10 设置改动四视口 Playwright 通过（1440×900、1280×780、1024×720、900×700），覆盖列表、编辑、最大化、两条最小化恢复入口的草稿保留、焦点循环、外部点击、Escape、reduced-motion；控制器回归覆盖重复打开与关闭后重新打开。使用真实组件和模拟回调，不是 Tauri 端到端。完整结果见 [测试与发布](testing-release-status.md)。
- 最后更新：2026-09-10
