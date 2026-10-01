# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：第一、第二阶段高优先级 v2 能力已接入，包括完整 Thread 生命周期、统一反向交互、原生模型目录、Review、Steer、Fork、归档恢复、只读读取、Thread 订阅释放、文件系统 watch，以及 `UserInput` 的本地图片和文件引用输入。
- 最近变更：剪贴板图片通过 Tauri 保存到隔离 CODEX_HOME 的 `attachments` 目录，再作为原生 `localImage` 输入发送；仅接受 PNG、JPEG、GIF、WebP、BMP 和 AVIF，单张上限 20 MiB。图片/PDF 预览增加 20 MiB Data URL 上限，Thread 项目变更通过权威 `thread/read` 同步。客户端已适配新 Runtime 的 MCP userVerification elicitation：API Key 模式显示不可用原因并允许拒绝，不伪造 OpenAI 账户验证。历史分页、contextCompaction 和生成协议边界见 [协议状态](protocol-status.md)。
- 当前接口：基础连接、带代际的 Tauri Transport、Thread/Turn、文件、Skills、MCP、模型、Review、压缩、Goal、Windows Sandbox、完整 Item 流、运行提示和 stderr 日志均通过兼容门禁 Runtime 的生成类型适配；侧边聊天复用 `thread/fork`/`thread/start`、`turn/start` 和同一连接，不增加自定义 app-server 方法。附件预览按需复用稳定 `fs/readFile`；剪贴板图片由 Tauri `save_pasted_image` 保存到隔离 CODEX_HOME 的 `attachments` 目录，再作为原生 `localImage` 输入发送。
- 已知问题：粘贴图片为保证历史 Session 路径仍可读取而持续保存在 CODEX_HOME，目前没有自动清理入口。尚未实现自动断线重连和请求级取消。远程目录、Account、Plugin/Marketplace 管理、Hooks、Realtime 和 Feedback 不属于 CS 产品范围。
- 升级适配：0.159.2 删除的 rollback RPC 已清理；分页与 revert 使用原生接口，网络失败不再被任意历史降级掩盖。图片输入 `fileId` 从历史及队列恢复到草稿后仍按原生格式发送，不请求托管文件下载、不暴露新账户能力。
- 下一步：优先增加断线后的可控恢复，保持 Skills 和 MCP 的薄管理边界。
- 验证证据：2026-09-16；Rust 定向测试覆盖受支持格式、未知 MIME、无效 Base64 和编码长度上限；前端输入测试覆盖持久化本地图片路径转为 `localImage`，MCP 交互测试覆盖 userVerification 的明确拒绝响应。订阅测试继续覆盖 Thread settings/Goal 权威通知、主/侧聊天隔离和过程事件过滤。
- 相关决策：[ADR-001：使用原版 Codex app-server](../decisions/ADR-001-unmodified-codex-app-server.md)。
- 最后更新：2026-10-01
