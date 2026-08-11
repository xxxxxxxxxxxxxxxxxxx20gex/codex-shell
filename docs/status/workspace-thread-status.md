# 工作区与线程状态

- 模块职责：管理项目目录、线程列表、创建、恢复与切换。
- 当前状态：默认工作区、文件浏览/mention、历史编号与引用、多轮恢复、多 Session 并行、归档恢复和分叉均已完成。
- 最近变更：Session 打开改用 `thread/read(includeTurns: true)` 只读预览，旧 paginated rollout 不支持时兼容回退 Resume；真正发送、压缩、Goal 或 Review 时才按需加载。归档 Session 必须先恢复再打开，新建/Fork 会回到活动列表；离开空闲 Session 或 detached Review 父 Session 后主动退订。
- 当前接口：Rust 默认工作区接口，以及 `WorkspaceSelector`、`WorkspaceExplorer`、`ThreadHistoryList`、`useWorkspaceFiles` 和 `useThreadController`。
- 已知问题：最近工作区目前只保存一个；文件预览会在前端截断前先跨 IPC 读取完整文件；控制器已拆历史与 Review，发送/Steer/元数据操作后续仍应按执行生命周期拆分。
- 下一步：增加断线后的 Session 恢复、最近工作区列表和 Git 摘要。
- 验证证据：Hook/DOM 测试覆盖只读打开、按需 Resume、后台完成后退订、paginated fallback、归档隔离、活动/归档操作、inline/detached Review 及权威 Thread 状态。
- 最后更新：2026-08-11
