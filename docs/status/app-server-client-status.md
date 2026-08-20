# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：新增原生 `thread/section/move` 客户端适配以对齐新版 Thread Section；Runtime 启动显式启用 Code Mode Host，使上游声明的本机执行工具拥有与官方桌面端一致的宿主进程。
- 当前接口：基础连接、带代际的 Tauri Transport、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过固定 Runtime 的生成类型适配。附件预览按需复用稳定 `fs/readFile`，没有增加自定义 app-server 方法或通用 file-attachment 变体。
- 已知问题：尚未实现自动断线重连和请求级取消。低优先级 Account、Plugin/App Marketplace、Hooks、Realtime 和 Feedback 仍未接入。
- 下一步：优先增加断线后的可控恢复；再评估 Plugin/Apps 和 Hooks，避免为个人第三方网关产品引入无用的 OpenAI 账户面板。
- 验证证据：`pnpm runtime:probe-local-tool` 通过用户已配置网关向固定 Runtime 发起本机文件读取，完成 Turn 并观察到两次 `commandExecution`；脚本只从环境接收凭据且不输出密钥。客户端测试同时覆盖 `thread/section/move` 请求体。
- 最后更新：2026-08-18
