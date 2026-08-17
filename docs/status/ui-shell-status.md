# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；生产 UI 已按 `design-plans/ui-refresh-v1.html` 完成首轮结构化迁移。
- 最近变更：完成 Quiet Graphite Workbench 设计系统收敛：生产文本不再出现 7–10px，所有有意义文本从 11px/16px 起步；功能样式改用语义 Token，硬编码色板集中到 `src/styles/tokens.css`；原 `Quiet Graphite`/`Final composer` 末尾覆盖层已折回所属规则并删除。Composer、命令、权限、附件、文件浏览、Diff、运行提示和任务活动的标准图标统一为 Lucide 16px/1.75px；组件圆角收敛到 4/6/8px。布局断点对齐 1180/900 契约，检查器和窄屏侧栏使用 overlay 而非直接隐藏。`App.tsx` 降到 334 行，状态/命令编排迁入 490 行的 `useAppController`，`App.css` 降到 500 行以内并把 Explorer、Command、Runtime 样式移回 feature owner。助手回答生成中侧线继续使用 24% 低饱和黄绿色，完成后回落为石墨灰。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；拖拽分隔线尚未支持键盘调宽；Shell Queue、Tauri IPC 错误与运行状态仍缺完整无障碍播报；Headless 浏览器不具备 Tauri transport，因此只能验证布局与样式，真实 IPC 仍以桌面构建和桌面 smoke 为准。
- 下一步：补齐分隔线键盘宽度调节、文件/会话键盘导航和运行状态无障碍播报；随后逐步把仍位于 `App.css` 的 Composer/时间线样式继续迁回 feature owner，但不再以末尾覆盖方式迁移。
- 验证证据：静态检查确认生产 CSS 无 7–10px 字号、Token 文件之外无十六进制色、无旧的末尾覆盖块，手写生产 TS/TSX/CSS 均未超过约 500 行；Headless Edge 已检查 1440×900、1280×780、1024×720、900×700 和 899×700 布局。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-17
