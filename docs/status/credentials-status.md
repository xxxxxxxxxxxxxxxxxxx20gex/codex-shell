# 凭据安全状态

- 模块职责：在 Windows Credential Manager 中维护用户 API Key，并只向授权的 app-server 子进程注入。
- 当前状态：单一主凭据的安全读写与真实网关验证已完成，前端不可回读明文。
- 最近变更：更新 `api.codex_algorithm_gateway` 本地凭据记忆条目；先验证 `/models`、`/responses` 和真实 app-server turn，再把脱敏凭据同步到中性 keyring service `com.codexshell.desktop`。
- 当前接口：`save_api_key`；`read_api_key` 仅供 Rust app-server 启动模块使用。
- 安全边界：Key 不进入项目源码、普通设置、命令行参数或状态文档；第三方 provider 通过 `env_key=OPENAI_API_KEY` 在子进程内读取，不创建明文 `auth.json`。
- 已知问题：当前只有一个主凭据，尚未支持多服务配置档案。
- 下一步：增加“测试连接”UI、友好鉴权错误和多配置档案设计。
- 验证证据：网关返回 21 个模型，`gpt-5.6-sol` 存在，Responses API 与真实 app-server 请求均完成；日志和回复未输出 Key。
- 最后更新：2026-08-07
