# 凭据安全状态

- 模块职责：在 Windows Credential Manager 中维护用户 API Key，并只向授权的 app-server 子进程注入。
- 当前状态：密钥按渠道保存。服务名 `com.codexshell.desktop`，账号名 `provider-channel-credentials`，值是一个 `{ "<channelId>": "<secret>" }` JSON 映射，渠道删除时同步移除对应键；映射为空时删除整条凭据。MCP HTTP Token 按 CODEX_HOME 隔离，app-server 启动时注入 CS 专用环境变量，前端不能回读。
- 最近变更：主 API Key 由单条 `primary-openai-api-key` 改为按渠道索引的映射；新增 `channel_secret_presence`，只返回已保存密钥的渠道 id 列表，不返回密钥本身；读取 v1 模型配置时把旧条目迁移到新渠道，迁移成功后删除旧条目，删除失败只报告不回滚；渠道 id 必须先通过 `^[a-z0-9][a-z0-9-]{0,63}$` 校验才允许作为映射键。
- 当前接口：`save_channel_secret(channelId, secret | null)`、`channel_secret_presence()`、`channel_id_is_valid`、`migrate_legacy_channel_secret`、`read_channel_secret`（仅后端启动与连接测试调用）、`save_mcp_secret`、`read_environment`。
- 安全边界：Key 不进入项目源码、普通设置、命令行参数或状态文档；第三方 provider 通过 `env_key=OPENAI_API_KEY` 在子进程内读取，不创建明文 `auth.json`；连接测试只在 Rust 侧使用密钥发起请求，返回值不含密钥或响应正文。前端只能写入和查询存在性，没有回读通道。
- 已知问题：更换或删除密钥后需重启 app-server 才会更新子进程环境；多条渠道密钥集中在单条凭据记录中，受系统凭据容量限制，写入已串行化但超大映射仍可能失败；真实 Credential Manager 写入与迁移仍需人工验收。
- 下一步：在渠道数量增长后评估密钥分片存储；为迁移失败提供可重试的设置内入口。
- 验证证据：2026-09-10；Rust 单测覆盖渠道 id 校验、渠道密钥映射与 v1 迁移路径，`pnpm rust:check` 的 31 项单测和 Clippy 通过；Vitest 覆盖 `channel_secret_presence` 只被调用一次、密钥经 `save_channel_secret` 写入且渲染从不回读、连接测试失败不回传密钥。未在真实 Windows 凭据管理器上做人工增删验收。
- 相关决策：[ADR-002：隔离运行数据与凭据](../decisions/ADR-002-isolated-runtime-data.md)、[ADR-004：以厂商分组的渠道承载模型路由](../decisions/ADR-004-model-provider-channels.md)。
- 最后更新：2026-09-10