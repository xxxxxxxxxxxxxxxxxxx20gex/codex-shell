# Diff 与文件变更状态

- 模块职责：展示工作区文件修改、增删统计与可审查 diff。
- 当前状态：app-server 实时 Diff 和历史文件变更审查视图已完成。
- 最近变更：直接消费 `turn/diff/updated` 的聚合 unified diff；恢复历史线程时从持久化 `fileChange.changes` 重建；右侧支持文件选择、增删统计和逐行着色。
- 当前接口：`DiffInspector`、`parseUnifiedDiff`、`AgentSessionState.diffsByTurnId`。
- 已知问题：尚未限制超大 Diff DOM 规模，也没有二进制文件专用提示和行号。
- 下一步：增加大文件截断/虚拟化、二进制状态与复制补丁操作。
- 验证证据：unified diff 单元测试覆盖多文件解析和增删计数；TypeScript、Vitest 与 Vite production build 通过。
- 最后更新：2026-08-07
