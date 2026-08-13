# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：initialize 按固定 Runtime 的能力结构显式声明 experimental API、关闭 attestation 请求并启用 MCP form elicitation。历史 Thread 的 Resume 只发送 `threadId`；模型、推理与权限统一留给下一次 `turn/start` 原子覆盖，避免重复调用和只读打开时修改 Thread 设置。稳定 `fs/watch`/`fs/unwatch` 继续使用 connection-scoped watch ID。
- 当前接口：基础连接、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过固定 Runtime 的生成类型适配。
- 已知问题：尚未实现自动断线重连和请求级取消；旧 app-server reader 的停止通知缺少进程代际，快速重启需要增加旧事件隔离。低优先级 Account、Plugin/App Marketplace、Hooks、Realtime 和 Feedback 仍未接入。
- 下一步：优先增加断线恢复与进程代际；再评估 Plugin/Apps 和 Hooks，避免为个人第三方网关产品引入无用的 OpenAI 账户面板。
- 验证证据：客户端与独立通知订阅测试验证完整 initialize capability、真实反向 request ID、过期请求无响应撤销，以及 Thread、Model、Review、Steer、MCP、`fs/watch`/`fs/unwatch` 的精确 wire shape；Thread 控制器测试验证 Resume 不携带设置覆盖。
- 最后更新：2026-08-11
