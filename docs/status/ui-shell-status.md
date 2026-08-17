# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；生产 UI 已按 `design-plans/ui-refresh-v1.html` 完成首轮结构化迁移。
- 最近变更：侧栏加入 48px 品牌头与 32px 新建对话按钮，主会话改为固定 48px 标题栏，时间线收敛到 820px 可读宽度，Composer 收敛到 860px 居中底栏；颜色、字号、控件高度统一由 `src/styles/tokens.css` 设计 token 驱动，历史会话操作统一使用 Lucide 图标。第二轮清理了工作区选择器的旧卡片外框、活动流的过小字号和检查器嵌套卡片视觉；第三轮将会话行操作收敛为设计稿中的右键菜单，移除刷新入口，并将置顶 Session 独立展示在列表顶部。Goal 和 Plan 仍为 Composer 底栏的单个可关闭互斥标签。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器；`App.tsx` 与 `App.css` 均已超过 600 行，Composer/弹层编排和多个 feature 样式仍集中在高频入口；本轮尚未做真实 Tauri IPC 下的截图回归。
- 下一步：先拆出 Composer 状态与弹层编排并按 feature 迁移样式，再补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：Composer 意图测试覆盖 Goal/Plan 互斥和再次点击退出，控制组件 DOM 测试验证只呈现一个可关闭标签；production preview 实测 Goal 不产生 `.agent-command-panel`，切换 Plan 后 Goal 标签数量为零。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-17
