# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：Transport 启动结果及 message、log、stopped 三类事件统一携带 `processId`/`generation`；客户端只消费当前启动代际的事件，旧 reader 即使在快速重启后延迟发出通知，也不会清空或污染新连接。附件仍按原生 `localImage`/`image`/带 `text_elements` 的文本路径映射。
- 当前接口：基础连接、带代际的 Tauri Transport、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过固定 Runtime 的生成类型适配。附件预览按需复用稳定 `fs/readFile`，没有增加自定义 app-server 方法或通用 file-attachment 变体。
- 已知问题：尚未实现自动断线重连和请求级取消。低优先级 Account、Plugin/App Marketplace、Hooks、Realtime 和 Feedback 仍未接入。
- 下一步：优先增加断线后的可控恢复；再评估 Plugin/Apps 和 Hooks，避免为个人第三方网关产品引入无用的 OpenAI 账户面板。
- 验证证据：客户端测试验证旧代际 stop、协议消息和日志均被丢弃，当前代际仍正常消费；既有测试继续覆盖 initialize capability、反向 request ID、Thread、Model、Review、Steer、MCP、文件 watch 与附件 wire shape。
- 最后更新：2026-08-14
