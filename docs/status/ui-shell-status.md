# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新。
- 最近变更：按 `DESIGN.md` 落地第一阶段 Quiet Graphite Workbench 视觉基础：运行时 Token 收敛到石墨中性、11px 元数据下限、15px 对话字号、稳定的 28/32/40px 控件几何；历史会话操作和 Composer 高频动作接入 `lucide-react`，不改变 Goal/Plan、队列、Steer、模型或审批行为。生产构建已完成 1440/1280/1024/900 四档布局验证。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：`App.css` 和若干 feature CSS 仍保留旧颜色、渐变和 7–10px 局部声明；本阶段通过 `shell-refresh.css` 覆盖高频壳层，尚未删除旧规则。文件搜索和会话操作尚未完成全键盘导航；`App.tsx` 与 `App.css` 均已超过 600 行。
- 下一步：按 `design-plans/ui-refresh-v1.md` 继续迁移时间线、Inspector、弹层和附件预览样式，删除已无消费者的旧 CSS；再补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：`pnpm typecheck` 通过，`pnpm test` 通过（49 个测试文件、200 项测试），`pnpm build` 通过；生产预览在 1280x780、1024x720、900x700 无页面溢出，右侧 Inspector 按断点收起，Composer 保持完整可见。Composer 意图测试继续覆盖 Goal/Plan 互斥和再次点击退出。
- 最后更新：2026-08-15
