# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；右侧栏收敛为单一的文件变更审查区。
- 最近变更：删除右栏“变更/状态/日志”页签和重复的 Session/项目状态卡；Sandbox、CODEX_HOME、运行提示和 stderr 日志迁入固定尺寸设置窗口的“运行环境/诊断”分页。Composer 上方的 Runtime Notice 直接打开诊断页，右栏仍保留独立缩放和显隐能力。
- 当前接口：`App`、`WindowTitleBar`、侧栏主操作、三栏布局、四分类 `PreferencesPanel`、Runtime Log/Notice、`ServerInteractionDialog`、Tauri Opener、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：无边框自绘最大化按钮通常不会触发 Windows 11 原生 Snap Layout 悬停菜单；文件搜索和会话操作尚未完成全键盘导航；拖拽分隔线尚未支持键盘调宽；Shell Queue、Tauri IPC 错误与运行状态仍缺完整无障碍播报。Headless 浏览器不具备 Tauri transport，因此窗口动作以单元测试、capability 校验和桌面构建为准。
- 下一步：补齐分隔线键盘宽度调节、文件/会话键盘导航和运行状态无障碍播报；随后逐步把仍位于 `App.css` 的 Composer/时间线样式继续迁回 feature owner，但不再以末尾覆盖方式迁移。
- 验证证据：设置组件测试覆盖四个分类、elevated Sandbox 配置、诊断内容和指定分页直达；静态检查确认旧 `StatusInspector`、`inspectorTab` 和页签样式均无残留引用。本地浏览器在 1280×780 验证右栏只显示“文件变更”，四个设置分页边界均固定为 700×620；900×700 下无横向溢出。
- 最后更新：2026-08-20
