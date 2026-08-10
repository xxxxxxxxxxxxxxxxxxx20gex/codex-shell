# 工作区与线程状态

- 模块职责：管理项目目录、线程列表、创建、恢复与切换。
- 当前状态：用户工作区选择、左侧文件浏览/预览、原生文件 mention、带编号与引用复制的线程管理、多轮恢复和多 Session 并行已完成。
- 最近变更：中央对话区显示当前 Session 编号与名称；历史列表按当前显示顺序生成纯展示编号，删除后自动压紧，不参与任何 RPC 或 Session 路由。每行可复制 app-server 返回的 rollout 路径，路径缺失时回退真实 Thread ID，供其他 Session 中的智能体定位内容。
- 当前接口：`WorkspaceSelector`、`WorkspaceExplorer`、`FileMentionMenu`、`useWorkspaceFiles`、`ThreadHistoryList`、`threadPresentation` 和 `useAgentSession`。
- 已知问题：最近工作区目前只保存一个；文件预览受 app-server `fs/readFile` 形状限制，会在前端截断前先跨 IPC 读取完整文件；尚未提供 Git 仓库状态和多工作区收藏。
- 下一步：增加最近工作区列表、文件树键盘导航、完整工作区搜索和 Git 分支摘要；需要恢复归档时再设计独立入口。
- 验证证据：新增测试覆盖编号顺序、删除后重新编号、名称回退、rollout 路径优先与 ID 回退；静态组件测试确认两类复制入口和可访问按钮说明。既有 workspace helper、文件预览与真实 app-server 文件读取验证继续有效。
- 最后更新：2026-08-10
