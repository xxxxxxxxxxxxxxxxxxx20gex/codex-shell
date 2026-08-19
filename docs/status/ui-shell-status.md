# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；生产 UI 已按 `design-plans/ui-refresh-v1.html` 完成首轮结构化迁移。
- 最近变更：发送后的首包等待态与后续执行态统一为同一个“正在处理 + 实时耗时”结构，不再先出现回答侧线、“正在等待模型响应”和“生成中”后再跳变；状态点升级为仅使用透明度和缩放的克制呼吸灯，并服从系统减少动态效果设置。真实回答仍只在首个回答块首行显示 2px 标记；临时重连状态继续收在当前 Turn 的处理中间态。
- 当前接口：`App`、`WindowTitleBar`、侧栏主操作、三栏布局、`PreferencesPanel`、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、Tauri Opener、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：无边框自绘最大化按钮通常不会触发 Windows 11 原生 Snap Layout 悬停菜单；文件搜索和会话操作尚未完成全键盘导航；拖拽分隔线尚未支持键盘调宽；Shell Queue、Tauri IPC 错误与运行状态仍缺完整无障碍播报。Headless 浏览器不具备 Tauri transport，因此窗口动作以单元测试、capability 校验和桌面构建为准。
- 下一步：补齐分隔线键盘宽度调节、文件/会话键盘导航和运行状态无障碍播报；随后逐步把仍位于 `App.css` 的 Composer/时间线样式继续迁回 feature owner，但不再以末尾覆盖方式迁移。
- 验证证据：静态检查确认生产 CSS 无 7–10px 字号、Token 文件之外无十六进制色、无旧的末尾覆盖块，手写生产 TS/TSX/CSS 均未超过约 500 行；Headless Edge 已检查 1440×900、1280×780、1024×720、900×700 和 899×700 布局。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-19
