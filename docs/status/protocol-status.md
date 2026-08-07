# 协议与生成类型状态

- 模块职责：锁定 app-server v2 线协议并提供匹配 Runtime 的 TypeScript 类型。
- 当前状态：稳定协议类型已经由固定 Runtime 生成。
- 最近变更：确认固定 Runtime 的稳定类型包含 Skills、MCP status、Compact 与 Goal；Plan collaborationMode 只存在于 experimental schema，稳定生成类型不包含该字段。
- 当前接口：`src/generated/app-server/v2` 为业务协议类型；JSON-RPC 信封由轻量客户端维护。
- 已知问题：尚未增加 CI drift 检查，JSON-RPC 信封仍使用本地最小类型。
- 下一步：增加生成产物 drift 校验，并在 collaborationMode 转为稳定 API 后重新评估 Plan 模式。
- 验证证据：`pnpm protocol:generate` 成功完成，未启用 experimental 参数。
- 最后更新：2026-08-06
