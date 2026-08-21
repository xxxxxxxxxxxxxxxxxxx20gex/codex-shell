# 凭据安全状态

- 模块职责：在 Windows Credential Manager 中维护用户 API Key，并只向授权的 app-server 子进程注入。
- 当前状态：单一主 API Key 的安全写入与子进程注入已完成，前端不可回读明文。
- 最近变更：凭据服务使用中性 keyring service `com.codexshell.desktop`；模型设置只保存 Base URL、模型 ID 和非敏感参数，app-server 启动时才从 Windows Credential Manager 读取 Key 并注入子进程。
- 当前接口：`save_api_key`；`read_api_key` 仅供 Rust app-server 启动模块使用。
- 安全边界：Key 不进入项目源码、普通设置、命令行参数或状态文档；第三方 provider 通过 `env_key=OPENAI_API_KEY` 在子进程内读取，不创建明文 `auth.json`。
- 已知问题：当前只有一个主凭据，尚未支持多服务配置档案。
- 下一步：增加“测试连接”UI、友好鉴权错误和多配置档案设计。
- 验证证据：Rust 接口只公开 `save_api_key` Tauri command，`read_api_key` 仅在后端启动模块内部调用；源码扫描未发现 PAT、API Key、用户密钥或开发机绝对路径，既有兼容网关 app-server smoke 已完成且未输出 Key。
- 相关决策：[ADR-002：隔离运行数据与凭据](../decisions/ADR-002-isolated-runtime-data.md)。
- 最后更新：2026-08-14
