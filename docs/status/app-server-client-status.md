# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：固定 Runtime 的 Goal 行为已通过本地假网关探针复核：`thread/goal/set` 自带 Runtime continuation，会发出 `turn/started` 并启动模型请求。Composer 只复用该 RPC，不额外调用 `turn/start`；Plan 进入前按需复用 `thread/goal/get` 与 `thread/goal/clear` 保证互斥。客户端监听器初始化失败时现在会回收 transport 并回到 `stopped`，订阅释放也会校验当前 handler，避免旧 disposer 误删新反向请求处理器。
- 当前接口：基础连接、带代际的 Tauri Transport、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过固定 Runtime 的生成类型适配。附件预览按需复用稳定 `fs/readFile`，没有增加自定义 app-server 方法或通用 file-attachment 变体。
- 已知问题：尚未实现自动断线重连和请求级取消。低优先级 Account、Plugin/App Marketplace、Hooks、Realtime 和 Feedback 仍未接入。
- 下一步：优先增加断线后的可控恢复；再评估 Plugin/Apps 和 Hooks，避免为个人第三方网关产品引入无用的 OpenAI 账户面板。
- 验证证据：`pnpm runtime:probe-goal` 使用临时 CODEX_HOME、假 API Key 和本地 503 网关验证固定 sidecar 会产生 `thread/goal/updated`、`thread/status/changed`、`turn/started` 与 `/v1/responses` 请求；不读取用户凭据且清理临时 Session。
- 最后更新：2026-08-18
