# 项目目录与线程状态

- 模块职责：管理项目目录（Thread `cwd`）、线程列表、创建、恢复与切换。
- 当前状态：新 Thread 使用发送首条消息前选择的自定义项目，未选择时使用 `Documents/Codex-Shell/YYYY-MM-DD` 默认项目目录；自定义选择不跨新对话持久化。已有 Thread 始终使用服务端返回的不可变 `cwd`，文件浏览、文件附件和相对路径解析均以该目录为根。每个非运行中的历史 Turn 都可通过原生 `thread/fork(lastTurnId)` 从该轮末尾创建分支。
- 最近变更：会话置顶对齐新版 app-server 的内置 Pinned Thread Section，通过 `thread/section/move` 写入并由 `Thread.section` 判断；不再依赖已删除的 `isPinned` 元数据。分支顺序和置顶优先展示保持现有行为。选择项目后可从左侧“项目文件”入口打开 WorkspaceExplorer，查看目录结构并单击预览文件；仍以当前 Thread `cwd` 或待创建 Thread 的项目路径为根。
- 当前接口：Rust `get_default_project_directory`，以及 `WorkspaceSelector`、`WorkspaceExplorer`、`ThreadHistoryList`、`useWorkspaceFiles`、`useThreadController` 和 `useThreadActions`。
- 已知问题：尚未提供显式的最近项目列表；文件预览会在前端截断前先跨 IPC 读取完整文件；`useThreadController` 已降到约 405 行，继续扩展 Thread 通知路由前仍应优先按生命周期职责拆分。
- 下一步：增加断线后的 Session 恢复、最近项目列表和 Git 摘要。
- 验证证据：Hook/DOM 测试覆盖项目选择、取消、Session 创建后锁定、默认目录识别、只读打开、按需 Resume、按指定历史 Turn 分叉、执行中分叉已完成 Turn、同步双击互斥、分叉期间拒绝发送/切换、重置后忽略迟到响应、Runtime 重启后同 Session 续聊、后台完成后退订、paginated fallback、归档隔离、文件 watch 防抖刷新、附件预览读取和 unmount 清理。
- 相关决策：[ADR-002：隔离运行数据与凭据](../decisions/ADR-002-isolated-runtime-data.md)。
- 最后更新：2026-08-18
