# 工作区与线程状态

- 模块职责：管理项目目录、线程列表、创建、恢复与切换。
- 当前状态：按日期自动创建的隔离默认工作区、用户项目选择、左侧文件浏览/预览、原生文件 mention、带编号与引用复制的线程管理、多轮恢复和多 Session 并行已完成。
- 最近变更：归档和永久删除均增加独立二次确认窗口，明确区分“归档记录仍保留”和“永久删除不可撤销”；取消按钮默认聚焦，并支持 Escape 或点击遮罩返回。每日默认工作区继续使用系统文档目录下的 `Codex-Shell/YYYY-MM-DD`。
- 当前接口：Rust `resolve_default_workspace/get_default_workspace`，以及 `WorkspaceSelector`、`WorkspaceExplorer`、`FileMentionMenu`、`useWorkspaceFiles`、`ThreadHistoryList`、`threadPresentation` 和 `useAgentSession`。
- 已知问题：最近工作区目前只保存一个；文件预览受 app-server `fs/readFile` 形状限制，会在前端截断前先跨 IPC 读取完整文件；尚未提供 Git 仓库状态和多工作区收藏。
- 下一步：增加最近工作区列表、文件树键盘导航、完整工作区搜索和 Git 分支摘要；需要恢复归档时再设计独立入口。
- 验证证据：前端静态渲染测试覆盖归档/永久删除两种确认文案和 `alertdialog` 语义；Rust 测试确认默认根目录和每日子目录命名，既有编号、引用、文件预览和真实 app-server 文件读取验证继续有效。
- 最后更新：2026-08-10
