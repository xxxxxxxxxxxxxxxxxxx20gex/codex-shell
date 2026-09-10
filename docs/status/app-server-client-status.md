# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：历史分页改为降序取最近 200 轮，再逆序交给时间线；不继续拉取超出上限的旧页。移除 thread/compacted 订阅与提示回调，contextCompaction 继续通过 item/started、item/completed 分发。生成类型与当前 Runtime 的实验导出对齐，协议边界见 [协议状态](protocol-status.md)。
- 当前接口：基础连接、带代际的 Tauri Transport、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过兼容门禁 Runtime 的生成类型适配；侧边聊天复用 `thread/fork`/`thread/start`、`turn/start` 和同一连接，不增加自定义 app-server 方法。附件预览按需复用稳定 `fs/readFile`，没有增加自定义 app-server 方法或通用 file-attachment 变体。
- 已知问题：尚未实现自动断线重连和请求级取消。本地 Plugin/Marketplace RPC 已接入管理页面；远程目录与 Account 不在本次范围；Hooks 独立管理、Realtime 和 Feedback 未接入。
- 下一步：优先增加断线后的可控恢复；再评估 Plugin/Apps 和 Hooks，避免为个人第三方网关产品引入无用的 OpenAI 账户面板。
- 验证证据：订阅测试覆盖 Thread settings/Goal 权威通知、非当前 Thread 的自动审查与终端交互过滤、当前 Thread 分发、主/侧聊天 delta 隔离和 `thread/section/move` 请求体；真实工具探针已确认 Code Mode Host 产生两次 `commandExecution`。所有探针只从环境接收凭据且不输出密钥。
- 相关决策：[ADR-001：使用原版 Codex app-server](../decisions/ADR-001-unmodified-codex-app-server.md)。
- 最后更新：2026-09-11
