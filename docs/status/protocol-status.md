# 协议与生成类型状态

- 模块职责：锁定 app-server v2 线协议并提供匹配 Runtime 的 TypeScript 类型。
- 当前状态：稳定协议类型由固定 Runtime 生成；Plan 使用最小化的局部实验字段适配。
- 最近变更：initialize 声明 `experimentalApi: true`，`AppServerClient.startTurn` 可选附加 `collaborationMode`；未重新生成整套 experimental schema，其他业务仍只消费稳定生成类型。
- 当前接口：`src/generated/app-server/v2` 为稳定业务协议类型；Plan 的局部 `CollaborationMode` 仅存在于客户端包装层；JSON-RPC 信封由轻量客户端维护。
- 已知问题：尚未增加 CI drift 检查，JSON-RPC 信封仍使用本地最小类型。
- 下一步：增加生成产物 drift 校验，并在 collaborationMode 转为稳定 API 后删除局部实验适配。
- 验证证据：序列化测试覆盖 initialize 能力和 Plan turn 精确请求体；固定 Runtime 的真实 Plan Turn 已完成。稳定 schema 仍由 `pnpm protocol:generate` 维护。
- 最后更新：2026-08-10
