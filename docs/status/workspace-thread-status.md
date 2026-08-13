# 项目目录与线程状态

- 模块职责：管理项目目录（Thread `cwd`）、线程列表、创建、恢复与切换。
- 当前状态：新 Thread 使用用户选择的项目目录，未选择时使用 `Documents/Codex-Shell/YYYY-MM-DD` 默认项目目录；已有 Thread 始终使用其服务端返回的 `cwd`，左侧随当前 Thread 展示但不会反写新对话的持久化项目选择。文件浏览、`@` mention 和相对路径解析均以当前 Thread 项目目录为根。
- 最近变更：将用户可见的“工作区”语义统一为“项目”，保留 `thread/start.cwd` 和旧 localStorage 键以兼容已有数据；默认每日目录明确为新 Thread 的兜底项目目录，和独立的 `CODEX_HOME`、权限/沙箱边界分离。Session 操作继续使用真实 Thread ID 或 rollout 路径。
- 当前接口：Rust `get_default_project_directory`，以及 `WorkspaceSelector`、`WorkspaceExplorer`、`ThreadHistoryList`、`useWorkspaceFiles` 和 `useThreadController`。
- 已知问题：最近项目目前只保存一个；文件预览会在前端截断前先跨 IPC 读取完整文件；控制器已拆历史与 Review，发送/Steer/元数据操作后续仍应按执行生命周期拆分。
- 下一步：增加断线后的 Session 恢复、最近项目列表和 Git 摘要。
- 验证证据：Hook/DOM 测试覆盖只读打开、按需 Resume、Runtime 重启后同 Session 续聊、后台完成后退订、paginated fallback、归档隔离、活动/归档操作、inline/detached Review、文件 watch 防抖刷新、预览重读和 unmount 清理。
- 最后更新：2026-08-13
