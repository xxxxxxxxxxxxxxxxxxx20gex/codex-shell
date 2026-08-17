# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；生产 UI 已按 `design-plans/ui-refresh-v1.html` 完成首轮结构化迁移。
- 最近变更：时间线底部行为改为显式保存“跟随最新”意图，流式回答增长时保持最后消息可见，用户主动上滑后则保留历史阅读位置；“返回最新”按最后一项底边定位。Turn 分隔视觉保持不变，但移除了会破坏虚拟列表高度测量的纵向外边距。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；拖拽分隔线尚未支持键盘调宽；Shell Queue、Tauri IPC 错误与运行状态仍缺完整无障碍播报；Headless 浏览器不具备 Tauri transport，因此只能验证布局与样式，真实 IPC 仍以桌面构建和桌面 smoke 为准。
- 下一步：补齐分隔线键盘宽度调节、文件/会话键盘导航和运行状态无障碍播报；随后逐步把仍位于 `App.css` 的 Composer/时间线样式继续迁回 feature owner，但不再以末尾覆盖方式迁移。
- 验证证据：静态检查确认生产 CSS 无 7–10px 字号、Token 文件之外无十六进制色、无旧的末尾覆盖块，手写生产 TS/TSX/CSS 均未超过约 500 行；Headless Edge 已检查 1440×900、1280×780、1024×720、900×700 和 899×700 布局。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-17
