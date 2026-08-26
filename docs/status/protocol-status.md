# 协议与生成类型状态

- 模块职责：维护 app-server v2 协议依赖、兼容性门禁并提供由 Runtime 生成的 TypeScript 类型。
- 当前状态：稳定协议类型已由 `0.149.0-alpha.4.1` Runtime 生成；Plan 使用最小化的局部实验字段适配。Runtime staging 允许新增协议，但会阻止当前调用面被删除。
- 最近变更：生成类型已与 `0.149.0-alpha.4.1` Runtime 同步；上游新增 Project、Thread Project 和严格审核通知，现有 CS 调用的 RPC、通知和反向请求保持不变。置顶从已移除的 `Thread.isPinned` 迁移到原生内置 Pinned Section，没有手改生成类型。
- 当前接口：`src/generated/app-server/v2` 为稳定业务协议类型；Plan 的局部 `CollaborationMode` 仅存在于客户端包装层；JSON-RPC 信封由轻量客户端维护。
- 已知问题：CI 尚未执行兼容门禁；JSON-RPC 信封仍使用本地最小类型；Runtime 新增协议不会自动接入 UI，若现有生成类型发生变化仍需显式重新生成、审查并回归，不得只替换主程序。
- 下一步：把 `check-runtime-compatibility.ps1` 纳入 CI，并在 collaborationMode 转为稳定 API 后删除局部实验适配。
- 验证证据：`pnpm protocol:generate` 从 `0.149.0-alpha.4.1` Runtime 重新生成类型；兼容门禁确认现有调用面保留；TypeScript、Vitest 和生产构建通过，置顶客户端序列化测试确认使用 `thread/section/move`。
- 相关决策：[ADR-001：使用原版 Codex app-server](../decisions/ADR-001-unmodified-codex-app-server.md)。
- 最后更新：2026-08-26
