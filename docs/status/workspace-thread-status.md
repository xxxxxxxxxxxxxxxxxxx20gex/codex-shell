# 项目目录与线程状态

- 模块职责：管理项目目录（Thread `cwd`）、线程列表、创建、恢复与切换。
- 当前状态：新 Thread 使用发送首条消息前选择的自定义项目，未选择时使用 `Documents/Codex-Shell/YYYY-MM-DD` 默认项目目录；自定义选择不跨新对话持久化。已有 Thread 始终使用服务端返回的不可变 `cwd`，文件浏览、文件附件和相对路径解析均以该目录为根。
- 最近变更：应用启动和“新对话”均回到当日默认项目；空白对话的自定义项目入口从左栏移动到 Composer 上方，可选择、切换或取消，取消时清除旧项目的文件 mention。首条消息创建 Thread 后入口直接隐藏，防止隐式新建对话或修改现有 Thread `cwd`；已有项目仍可从状态区浏览文件。
- 当前接口：Rust `get_default_project_directory`，以及 `WorkspaceSelector`、`WorkspaceExplorer`、`ThreadHistoryList`、`useWorkspaceFiles` 和 `useThreadController`。
- 已知问题：尚未提供显式的最近项目列表；文件预览会在前端截断前先跨 IPC 读取完整文件；控制器已拆历史与 Review，发送/Steer/元数据操作后续仍应按执行生命周期拆分。
- 下一步：增加断线后的 Session 恢复、最近项目列表和 Git 摘要。
- 验证证据：Hook/DOM 测试覆盖项目选择、取消、Session 创建后锁定、默认目录识别、只读打开、按需 Resume、Runtime 重启后同 Session 续聊、后台完成后退订、paginated fallback、归档隔离、文件 watch 防抖刷新、附件预览读取和 unmount 清理。
- 最后更新：2026-08-14
