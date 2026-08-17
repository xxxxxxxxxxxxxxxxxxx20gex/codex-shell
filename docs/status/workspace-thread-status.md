# 项目目录与线程状态

- 模块职责：管理项目目录（Thread `cwd`）、线程列表、创建、恢复与切换。
- 当前状态：新 Thread 使用发送首条消息前选择的自定义项目，未选择时使用 `Documents/Codex-Shell/YYYY-MM-DD` 默认项目目录；自定义选择不跨新对话持久化。已有 Thread 始终使用服务端返回的不可变 `cwd`，文件浏览、文件附件和相对路径解析均以该目录为根。每个非运行中的历史 Turn 都可通过原生 `thread/fork(lastTurnId)` 从该轮末尾创建分支。
- 最近变更：恢复历史回答末尾的分叉入口，并把选中 Turn ID 贯通到 app-server `lastTurnId`，分支只包含该 Turn 及之前的内容，不再错误复制整个 Session。当前 Session 的后续 Turn 正在执行时，已经完成的历史 Turn 仍可分叉并切换到新分支，原 Session 继续在后台运行。
- 当前接口：Rust `get_default_project_directory`，以及 `WorkspaceSelector`、`WorkspaceExplorer`、`ThreadHistoryList`、`useWorkspaceFiles` 和 `useThreadController`。
- 已知问题：尚未提供显式的最近项目列表；文件预览会在前端截断前先跨 IPC 读取完整文件；历史、Review 和 Turn 执行已拆出，但 `useThreadController.ts` 仍接近 500 行，Thread 元数据操作、Queue 协调和通知路由继续扩展前应进一步拆分。
- 下一步：增加断线后的 Session 恢复、最近项目列表和 Git 摘要。
- 验证证据：Hook/DOM 测试覆盖项目选择、取消、Session 创建后锁定、默认目录识别、只读打开、按需 Resume、按指定历史 Turn 分叉、执行中分叉已完成 Turn、Runtime 重启后同 Session 续聊、后台完成后退订、paginated fallback、归档隔离、文件 watch 防抖刷新、附件预览读取和 unmount 清理。
- 最后更新：2026-08-17
