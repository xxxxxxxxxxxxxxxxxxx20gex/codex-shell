# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：纠正普通文件误用资源 `mention` 的映射。图片路径继续发送 `localImage`，剪贴板图片发送 inline `image`；普通文件和目录把绝对路径放入 `text`，并用固定 Runtime 已提供的 `text_elements` 标记 UTF-8 byte range，模型可通过 Codex 文件工具读取真实路径，历史 UI 也能还原附件卡片。
- 当前接口：基础连接、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过固定 Runtime 的生成类型适配。附件预览按需复用稳定 `fs/readFile`，没有增加自定义 app-server 方法或通用 file-attachment 变体。
- 已知问题：尚未实现自动断线重连和请求级取消；旧 app-server reader 的停止通知缺少进程代际，快速重启需要增加旧事件隔离。低优先级 Account、Plugin/App Marketplace、Hooks、Realtime 和 Feedback 仍未接入。
- 下一步：优先增加断线恢复与进程代际；再评估 Plugin/Apps 和 Hooks，避免为个人第三方网关产品引入无用的 OpenAI 账户面板。
- 验证证据：客户端与独立通知订阅测试验证完整 initialize capability、真实反向 request ID、过期请求无响应撤销，以及 Thread、Model、Review、Steer、MCP、`fs/watch`/`fs/unwatch` 的精确 wire shape；附件测试验证 `localImage`/`image`、普通文件 `text_elements` 和 `fs/readFile` 预览链路。
- 最后更新：2026-08-14
