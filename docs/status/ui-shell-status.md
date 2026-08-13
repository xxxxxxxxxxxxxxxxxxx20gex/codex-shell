# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新。
- 最近变更：完成保持行为的前端生命周期审查。附件菜单现复用统一弹层机制，支持外部点击和 Escape 关闭；Composer 的 Tauri 拖拽监听从 `App` 抽到独立 Hook，并修复组件卸载早于异步监听注册完成时遗留 listener 的竞态，同时保留高 DPI 命中换算、图片/文件分类与错误反馈。Queue、Steer、Session 切换和 app-server 输入协议未改动。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、附件菜单、slash/Skill/MCP/Goal/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器；`App.tsx` 仍约 600 行，Composer 与面板编排是下一处拆分边界；`App.css` 仍集中承载多个 feature 的样式，后续应随功能改动逐块迁移，避免继续扩大共享样式耦合。
- 下一步：补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：附件菜单测试覆盖单一入口、统一路径回调、外部点击与 Escape 关闭；Composer 拖拽 Hook 测试覆盖高 DPI 坐标换算、输入区命中、区域外忽略、异步注册后卸载清理和注册错误反馈。sessionInput 继续覆盖 `localImage`/`image`/`mention` 原生输入；Queue/Steer、Session、时间线和工作区回归保持通过。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-13
