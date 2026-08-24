# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；右侧栏收敛为单一的文件变更审查区。
- 最近变更：主题敏感颜色已从根级过渡别名迁移到 canonical 语义 Token，修复浅色与跟随系统浅色模式下模型选择、会话选中、Composer 菜单、附件、Diff 和诊断状态仍继承深色值的问题；深色配色保持不变。右栏继续只负责文件变更审查，运行环境与诊断位于固定尺寸设置窗口；当前 Session 的 UI 错误改由可关闭、5 秒自动消失的临时提示承载，切换 Session 会清理旧提示；错误/成功横条统一 38px 高度，关闭按钮固定在最右侧；选择项目后，左侧主操作区新增“项目文件”入口，复用 WorkspaceExplorer 展开目录并预览文件。
- 当前接口：`App`、`WindowTitleBar`、侧栏主操作、三栏布局、四分类 `PreferencesPanel`、Runtime Log/Notice、`ServerInteractionDialog`、Tauri Opener、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：无边框自绘最大化按钮通常不会触发 Windows 11 原生 Snap Layout 悬停菜单；文件搜索和会话操作尚未完成全键盘导航；拖拽分隔线尚未支持键盘调宽；Shell Queue、Tauri IPC 错误与运行状态仍缺完整无障碍播报。Headless 浏览器不具备 Tauri transport，因此窗口动作以单元测试、capability 校验和桌面构建为准。
- 下一步：补齐分隔线键盘宽度调节、文件/会话键盘导航和运行状态无障碍播报；随后逐步把仍位于 `App.css` 的 Composer/时间线样式继续迁回 feature owner，但不再以末尾覆盖方式迁移。
- 验证证据：设置组件测试覆盖四个分类、elevated Sandbox 配置、诊断内容和指定分页直达；主题迁移后的完整质量门禁通过。浏览器 computed style 确认浅色 `--surface-selected=#dce4d8`、`--text-primary=#1c211d`、`--border-subtle=#d7ddd7`、`--accent-action=#628b19`，深色 Token 保持原值；1440×900、1280×780、1024×720 和 900×700 均无页面级横向溢出。
- 最后更新：2026-08-21
