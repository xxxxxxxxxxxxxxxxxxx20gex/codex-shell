# 桌面 UI 壳状态

- 模块职责：提供 Windows 桌面三栏智能体工作台和响应式布局。
- 当前状态：P0 三栏工作台已接入完整执行时间线、统一服务端交互、Diff、原生 Review、模型目录、多 Session 并行和项目目录实时刷新。
- 最近变更：修复 Tauri WebView CSP 未允许 `data:` 图片来源导致剪贴板图片和本地图片预览显示破图的问题；图片白名单只增加内嵌 `data:`，不开放任意文件路径、Blob 或额外网络来源。Composer 与历史消息继续共用附件画廊和预览弹层。
- 当前接口：`App`、三栏布局、`StatusInspector`、Runtime Log/Notice、`ServerInteractionDialog`、工作区浏览器、附件菜单、slash/Skill/MCP/Goal/Review 面板、时间线、Diff 和模型设置。
- 已知问题：文件搜索和会话操作尚未完成全键盘导航；移动宽度仍隐藏侧栏与检查器；`App.tsx` 仍约 600 行，Composer 与面板编排是下一处拆分边界；`App.css` 仍集中承载多个 feature 的样式，后续应随功能改动逐块迁移，避免继续扩大共享样式耦合。
- 下一步：补齐拖拽分隔线的键盘宽度调节、文件/会话键盘导航和无障碍状态播报。
- 验证证据：附件画廊测试覆盖文件卡片、文本读取、data URL 和本地图片缩略图/大图预览、删除回调与 Escape 关闭；Tauri production config/build 验证 `img-src` 包含 `data:` 且配置可被打包工具解析。完整门禁结果记录于测试状态文档。
- 最后更新：2026-08-14
