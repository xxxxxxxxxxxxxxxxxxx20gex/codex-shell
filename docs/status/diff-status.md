# Diff 与文件变更状态

- 模块职责：消费 app-server 的项目文件修改事件，并为会话时间线提供增删统计与文件变更详情。
- 当前状态：app-server 实时 Diff 和历史文件变更仍由状态层消费并在会话时间线展示；右侧 inspector 不再重复展示 Diff，改为提供项目文件浏览入口。
- 最近变更：移除右侧重复的 `DiffInspector` 渲染，保留 `AgentSessionState.diffsByTurnId` 和会话时间线的文件变更展示；项目文件通过右侧 inspector 的 WorkspaceExplorer 入口打开。
- 当前接口：`parseUnifiedDiff`、`AgentSessionState.diffsByTurnId` 和会话时间线的文件变更项。
- 已知问题：尚未限制超大 Diff DOM 规模，也没有二进制文件专用提示和行号。
- 下一步：增加大文件截断/虚拟化、二进制状态与复制补丁操作。
- 验证证据：parser 测试覆盖多文件、增删计数及新增/删除/重命名语义；happy-dom 测试覆盖会话时间线文件状态摘要和工作区跳转回调。2026-08-25 清理未被生产代码引用的旧 `DiffInspector` 组件、样式和测试后，TypeScript、ESLint、Vitest、Vite build、Rust check、Clippy 均通过。
- 最后更新：2026-08-25
- 最后更新：2026-08-21
