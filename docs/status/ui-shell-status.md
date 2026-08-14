# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新。
- 最近变更：Goal 和 Plan 统一显示为 Composer 底栏的单个可关闭模式标签，切换时直接替换另一模式；Goal 使用主输入框及专属占位文案，不再打开占用输入空间的独立面板。production preview 已验证两种模式的标签、占位文案和互斥切换均无重叠。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器；`App.tsx` 与 `App.css` 均已超过 600 行，Composer/弹层编排和多个 feature 样式仍集中在高频入口。
- 下一步：先拆出 Composer 状态与弹层编排并按 feature 迁移样式，再补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：Composer 意图测试覆盖 Goal/Plan 互斥和再次点击退出，控制组件 DOM 测试验证只呈现一个可关闭标签；production preview 实测 Goal 不产生 `.agent-command-panel`，切换 Plan 后 Goal 标签数量为零。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-14
