# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新；生产 UI 已按 `design-plans/ui-refresh-v1.html` 完成首轮结构化迁移。
- 最近变更：消息时间线进一步对齐 Quiet Graphite Workbench：回答保持 15px/24px，处理过程使用 13px/20px，元信息使用 11px/16px；文件变更采用 Lucide 文件图标、12px 等宽路径和信息蓝/成功绿/危险红语义色。助手回答侧线在完成后使用石墨灰，生成中改用更低饱和度的黄绿色（强调色与结构边界按 24%/76% 混合），避免等待期间持续抢占正文注意力。会话列表使用固定 40px 行、13px 标题和 11px 元信息，置顶标识与运行/分支状态迁移到设计 token；置顶会话仍立即排列到列表顶部。模型高级设置已迁移到 8px Graphite 弹窗、标准字号层级和语义焦点环，配置、凭据及重启逻辑不变。排队消息继续只在 Composer 上方显示时钟等待卡，普通用户消息保持紧凑气泡；新对话保留“选择项目”文字入口。归档无需二次确认，永久删除仍需确认；Goal 与 Plan 仍为单个可关闭互斥标签。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、`ComposerAddMenu`、`ComposerIntentControl`、slash/Skill/MCP/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器；`App.tsx` 与 `App.css` 均已超过 600 行，Composer/弹层编排和多个 feature 样式仍集中在高频入口；附件预览和审批弹窗仍保留部分旧样式，迁移它们需要逐个核对业务态；本轮尚未做真实 Tauri IPC 下的截图回归。
- 下一步：先拆出 Composer 状态与弹层编排并按 feature 迁移样式，再补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：Composer 意图测试覆盖 Goal/Plan 互斥和再次点击退出，控制组件 DOM 测试验证只呈现一个可关闭标签；production preview 实测 Goal 不产生 `.agent-command-panel`，切换 Plan 后 Goal 标签数量为零。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-17
