# 桌面 UI 壳状态

- 模块职责：提供 Windows 三栏工作台、设置面板、主题与系统窗口交互；视觉契约以 [DESIGN.md](../../DESIGN.md) 为准。
- 当前状态：左栏管理 Session，中间承载对话或扩展管理页，右栏提供项目文件和只读侧边聊天。Inspector 主页与侧聊默认 288px，项目文件视图默认 400px；文件树默认 220px，为图片和文本预览保留可见空间，用户仍可拖拽调整。支持深色、浅色和跟随系统主题。历史行标题使用 14px Token，操作列在 hover/focus 时展开为 56px，不使用渐变遮罩。
- 最近变更：按场景管理右键：空白、按钮及未选中的正文屏蔽浏览器页面菜单；启用的文本输入框（含只读框）、textarea 和 contenteditable 固定提供全选、复制、粘贴三项；无选区或密码框禁用复制，只读框禁用粘贴。文本粘贴保留原生撤销和 React 状态更新，对话框图片粘贴复用既有附件处理；选中的正文提供单项复制菜单。文件树和会话列表专用菜单优先，设置及批注 Portal 同样受规则管理。正文与文件树复用菜单定位、键盘操作和关闭逻辑。
- Composer 编辑历史消息时直接显示原文，不额外显示编辑提示条或取消按钮；发送仍沿用末回合替换逻辑，失败时保留当前草稿。
- 当前接口：`App`、`WindowTitleBar`、`ContextMenuPolicy`、`ContextMenu`、`PreferencesPanel`、`useResizablePanels`、`WorkspaceExplorer`、`SideChatPanel`、`TransientNotice`。
- 布局边界：右侧详情共享 Inspector 生命周期；最大化保留左栏并收起对话列，恢复回到三栏。分隔线通过 CSS 变量及 requestAnimationFrame 更新，释放后同步状态。窗口自绘按钮不保证 Windows 11 Snap Layout 悬停菜单。右键策略只覆盖应用 DOM，不接管 iframe 内嵌文档查看器；粘贴只在用户点击时读取剪贴板，权限拒绝会提示使用 Ctrl+V，不会覆盖草稿。
- 模块归属：渠道见 [模型配置](model-config-status.md)，消息与资源见 [时间线](timeline-status.md) 和 [Diff](diff-status.md)，Skills/MCP/Plugins 见 [扩展能力](agent-capabilities-status.md)，侧聊生命周期见 [项目与线程](workspace-thread-status.md)。
- 资源菜单：带本地路径的回复链接、附件/资源缩略图及文件变更条目优先提供“复制绝对路径”，复用共享菜单、剪贴板及当前会话项目路径解析；现有输入框和文件树规则保持不变。路径解析边界见 [时间线](timeline-status.md)。
- 审查修复：复制降级路径使用 finally 移除临时文本框并恢复焦点，执行失败仍向上报告；右键策略和弹层监听随卸载解除。
- 已知问题：文件/会话完整键盘导航、拖拽键盘调宽、队列与侧聊状态播报仍不完整；切换设置分类或关闭设置会丢弃未保存的渠道草稿。旧样式尚未全部收敛到设计契约。
- 下一步：补齐键盘导航与状态播报；渠道切换人工验收见模型配置状态。
- 验证证据：2026-09-10 设置、2026-09-17 右键四尺寸浏览器检查通过，覆盖焦点、关闭、边界避让与 reduced-motion；组件回归覆盖编辑菜单、只读／密码限制、Portal、监听释放、异步草稿变化和剪贴板失败。Chromium 中验证文本撤销与图片粘贴，不等同于 WebView2 权限验收。完整基线见 [测试与发布](testing-release-status.md)。
- 最后更新：2026-09-18
