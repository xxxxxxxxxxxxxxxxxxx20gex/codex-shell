# 工作区与线程状态

- 模块职责：管理项目目录、线程列表、创建、恢复与切换。
- 当前状态：用户工作区选择、左侧文件浏览/预览、原生文件 mention、精简线程列表管理、多轮恢复和多 Session 并行已完成。
- 最近变更：点击当前工作区改为打开左侧抽屉，目录通过 `fs/readDirectory` 懒加载，单击文件通过 `fs/readFile` 预览；文本限制为前 200 KB / 4000 行，图片使用内存 data URL，二进制文件不强制渲染；更换目录使用独立“选择工作区”按钮。
- 当前接口：`WorkspaceSelector`、`WorkspaceExplorer`、`FileMentionMenu`、`useWorkspaceFiles`、`ThreadHistoryList` 和 `useAgentSession`。
- 已知问题：最近工作区目前只保存一个；尚未提供 Git 仓库状态和多工作区收藏。
- 下一步：增加最近工作区列表、文件树键盘导航、完整工作区搜索和 Git 分支摘要；需要恢复归档时再设计独立入口。
- 验证证据：workspace helper 覆盖 mention token、Windows 动态路径拼接和相对路径；文件预览测试覆盖 UTF-8、图片、二进制与大小格式，真实 app-server 目录/文件读取通过。
- 最后更新：2026-08-07
