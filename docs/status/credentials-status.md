# 凭据安全状态

- 模块职责：在 Windows Credential Manager 中维护用户 API Key。
- 当前状态：最小接口已实现。
- 最近变更：增加保存、存在性检查、删除和 Rust 内部读取；不提供前端回读接口。
- 当前接口：`save_api_key`、`has_api_key`、`clear_api_key`；`read_api_key` 仅供进程启动模块使用。
- 已知问题：当前只有一个主凭据，尚未支持多服务配置档案。
- 下一步：补充 Windows 集成测试与友好的凭据缺失引导。
- 验证证据：源码审查确认普通配置只包含 Base URL 和模型选项。
- 最后更新：2026-08-06
