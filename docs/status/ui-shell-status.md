# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；右侧 inspector 默认显示功能入口页，项目文件浏览与 Codex 风格侧边聊天从入口进入，文件变更由会话时间线展示。
- 最近变更：主题敏感颜色已从根级过渡别名迁移到 canonical 语义 Token，修复浅色与跟随系统浅色模式下模型选择、会话选中、Composer 菜单、附件、Diff 和诊断状态仍继承深色值的问题；深色配色保持不变。右侧 inspector 改为“功能入口页 → 具体功能”的两级结构，项目文件和侧边聊天不再直接混在同一分类栏；WorkspaceExplorer 仍从右侧滑入并支持拖拽调整宽度及一键扩大到最大/缩小到最小；侧边聊天只有在 ephemeral Thread 创建成功后才进入详情页，fork 继承的主会话历史仅用于模型上下文、不在右栏重复渲染；详情页由固定高度和单一内部滚动容器承载，Composer 固定为紧凑 42px 初始高度并限制最大高度；侧聊关闭时会中断活动 Turn（连接可用时）再退订，主 Session 切换或 Runtime 重置后自动返回功能入口；Composer 复用 `--font-ui` 和 `--shadow-popover` 语义 Token；侧聊支持从主 Thread 最近已完成回合 fork、独立流式时间线、最大化/恢复和 `Ctrl/Cmd+Alt+S` 打开；移除重复的右侧 Diff 面板；运行环境与诊断位于固定尺寸设置窗口；当前 Session 的 UI 错误改由可关闭、5 秒自动消失的临时提示承载，切换 Session 会清理旧提示；错误/成功横条统一 38px 高度，关闭按钮固定在最右侧。
- 当前接口：`App`、`WindowTitleBar`、侧栏主操作、三栏布局、四分类 `PreferencesPanel`、Runtime Log/Notice、`ServerInteractionDialog`、Tauri Opener、工作区浏览器、`SideChatPanel`、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 事件消费和模型设置。
- 交互校正：项目文件入口直接打开 WorkspaceExplorer；只有默认项目路径尚未准备好时才进入提示页，不再要求用户重复点击“打开项目文件”。
- 已知问题：无边框自绘最大化按钮通常不会触发 Windows 11 原生 Snap Layout 悬停菜单；文件搜索和会话操作尚未完成全键盘导航；拖拽分隔线尚未支持键盘调宽；Shell Queue、侧边聊天输入、Tauri IPC 错误与运行状态仍缺完整无障碍播报。侧边聊天当前固定为只读沙箱且不支持审批交互，适合旁聊和分析，不承担主会话的写入任务。Headless 浏览器不具备 Tauri transport，因此窗口动作以单元测试、capability 校验和桌面构建为准。
- 下一步：补齐分隔线键盘宽度调节、文件/会话键盘导航和运行状态无障碍播报；随后逐步把仍位于 `App.css` 的 Composer/时间线样式继续迁回 feature owner，但不再以末尾覆盖方式迁移。
- 验证证据：设置组件测试覆盖四个分类、elevated Sandbox 配置、诊断内容和指定分页直达；主题迁移后的完整质量门禁通过。浏览器 computed style 确认浅色 `--surface-selected=#dce4d8`、`--text-primary=#1c211d`、`--border-subtle=#d7ddd7`、`--accent-action=#628b19`，深色 Token 保持原值；1440×900、1280×780、1024×720 和 900×700 均无页面级横向溢出。
- 最后更新：2026-08-24
