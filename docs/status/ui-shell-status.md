# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；生产 UI 已按 `design-plans/ui-refresh-v1.html` 完成首轮结构化迁移。
- 最近变更：采用负形核心 `CS` 字标作为桌面应用图标；可维护矢量母版位于 `assets/branding/cs-app-icon.svg`，Tauri 平台图标统一由该母版生成，不再单独手改派生尺寸。产品名称、应用 ID、数据目录和窗口标题保持 Codex Shell，不因交流简称 CS 发生迁移。
- 当前接口：`App`、`WindowTitleBar`、侧栏主操作、三栏布局、`PreferencesPanel`、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、Tauri Opener、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：无边框自绘最大化按钮通常不会触发 Windows 11 原生 Snap Layout 悬停菜单；文件搜索和会话操作尚未完成全键盘导航；拖拽分隔线尚未支持键盘调宽；Shell Queue、Tauri IPC 错误与运行状态仍缺完整无障碍播报。Headless 浏览器不具备 Tauri transport，因此窗口动作以单元测试、capability 校验和桌面构建为准。
- 下一步：补齐分隔线键盘宽度调节、文件/会话键盘导航和运行状态无障碍播报；随后逐步把仍位于 `App.css` 的 Composer/时间线样式继续迁回 feature owner，但不再以末尾覆盖方式迁移。
- 验证证据：静态检查确认生产 CSS 无 7–10px 字号、Token 文件之外无十六进制色、无旧的末尾覆盖块，手写生产 TS/TSX/CSS 均未超过约 500 行；Headless Edge 已检查 1440×900、1280×780、1024×720、900×700 和 899×700 布局。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-19
