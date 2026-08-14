# 项目目录与线程状态

- 模块职责：管理项目目录（Thread `cwd`）、线程列表、创建、恢复与切换。
- 当前状态：新 Thread 使用用户选择的项目目录，未选择时使用 `Documents/Codex-Shell/YYYY-MM-DD` 默认项目目录；已有 Thread 始终使用其服务端返回的 `cwd`，左侧随当前 Thread 展示但不会反写新对话的持久化项目选择。文件浏览、文件附件和相对路径解析均以当前 Thread 项目目录为根。
- 最近变更：普通文件附件通过绝对路径进入用户输入，并用原生 `text_elements` 在 rollout 中保留可还原的显示元数据；历史消息按需调用 `fs/readFile` 预览，旧版本已经保存的绝对路径 `mention` 仍兼容显示为文件卡片。未扩大 Tauri asset protocol 文件访问范围。
- 当前接口：Rust `get_default_project_directory`，以及 `WorkspaceSelector`、`WorkspaceExplorer`、`ThreadHistoryList`、`useWorkspaceFiles` 和 `useThreadController`。
- 已知问题：最近项目目前只保存一个；文件预览会在前端截断前先跨 IPC 读取完整文件；控制器已拆历史与 Review，发送/Steer/元数据操作后续仍应按执行生命周期拆分。
- 下一步：增加断线后的 Session 恢复、最近项目列表和 Git 摘要。
- 验证证据：Hook/DOM 测试覆盖只读打开、按需 Resume、Runtime 重启后同 Session 续聊、后台完成后退订、paginated fallback、归档隔离、活动/归档操作、inline/detached Review、文件 watch 防抖刷新、附件预览读取和 unmount 清理。
- 最后更新：2026-08-14
