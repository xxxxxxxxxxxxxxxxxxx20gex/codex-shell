# 协议与生成类型状态

- 模块职责：锁定 app-server v2 线协议并提供匹配 Runtime 的 TypeScript 类型。
- 当前状态：稳定协议类型由固定 Runtime 生成；Plan 使用最小化的局部实验字段适配。
- 最近变更：生成类型已与固定 `0.148.0-alpha.15` Runtime 同步；新增 Thread Section、模型 multi-agent 元数据、MCP 只读提示和阻塞式用户输入等上游字段。置顶从已移除的 `Thread.isPinned` 迁移到原生内置 Pinned Section，没有手改生成类型。
- 当前接口：`src/generated/app-server/v2` 为稳定业务协议类型；Plan 的局部 `CollaborationMode` 仅存在于客户端包装层；JSON-RPC 信封由轻量客户端维护。
- 已知问题：尚未增加 CI drift 检查，JSON-RPC 信封仍使用本地最小类型；后续升级仍必须同时固定 Runtime、全部 companion binaries 和生成类型，不得只替换主程序。
- 下一步：增加生成产物 drift 校验，并在 collaborationMode 转为稳定 API 后删除局部实验适配。
- 验证证据：`pnpm protocol:generate` 从固定 Runtime 重新生成类型；TypeScript、238 项 Vitest 测试和生产构建通过，置顶客户端序列化测试确认使用 `thread/section/move`。
- 最后更新：2026-08-14
