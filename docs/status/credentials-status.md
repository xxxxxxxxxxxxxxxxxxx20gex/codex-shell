# 凭据安全状态

- 模块职责：在 Windows Credential Manager 保存渠道 API Key，仅在后端读取并注入授权子进程。
- 当前状态：服务 com.codexshell.desktop、账号 provider-channel-credentials 保存按渠道 ID 索引的映射。前端只能提交密钥和查询存在性，无回读接口；MCP Token 继续使用独立的 CS 环境变量注入。
- 最近变更：删除独立 save_channel_secret 前端命令，密钥增删与渠道配置统一经 save_model_settings 提交。配置先校验并检查预期版本，再在凭据锁内更新映射并提交配置；配置失败恢复旧映射，恢复失败明确报错，不吞掉删除失败。settings.json 使用同目录临时文件同步后原子替换。
- 迁移边界：v1 使用稳定的 vendor-legacy ID，保留 settings.v1.bak.json；新映射及配置成功写入后才删除旧凭据。备份或落盘失败上报且保留旧凭据，重试不会生成另一个随机身份。首次启动也先持久化默认渠道身份。
- 当前接口：save_model_settings(settings, expected, secretChange)、channel_secret_presence、read_channel_secret（后端）、migrate_legacy_channel_secret、save_mcp_secret、read_environment。
- 安全边界：Key 不进入源码、普通配置、日志、命令行参数或前端回读。连接探针返回状态与数量，不返回密钥或响应正文。
- 已知问题：文件系统与系统凭据不支持跨存储崩溃原子提交；进程被强制结束、断电或补偿写入失败时可能需要重新保存渠道密钥。v1 最后删除旧凭据失败时新配置已有效，旧条目可能残留，不能假定自动清理成功。单条映射受 Windows 凭据容量限制。未在真实 Credential Manager 执行本次增删与故障注入验收。
- 下一步：人工验证真实系统凭据增删、迁移及容量边界；不为测试改动现有用户密钥。
- 验证证据：2026-09-10；Rust 测试使用内存写入替身覆盖配置失败补偿、补偿失败报错、密钥失败不提交配置；临时目录测试覆盖初始身份持久化、原子替换、迁移失败和稳定 ID。上述不等于真实 Keyring 测试，完整基线见 [测试与发布](testing-release-status.md)。
- 相关决策：[ADR-002](../decisions/ADR-002-isolated-runtime-data.md)、[ADR-004](../decisions/ADR-004-model-provider-channels.md)。
- 最后更新：2026-09-10
