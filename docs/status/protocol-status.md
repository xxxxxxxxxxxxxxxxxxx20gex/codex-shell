# 协议与生成类型状态

- 模块职责：维护 app-server v2 协议依赖、兼容性门禁并提供由 Runtime 生成的 TypeScript 类型。
- 当前状态：稳定协议类型仍由 `codex-cli 0.152.1` Runtime 生成；公开 `v0.1.1` 安装包使用通过兼容门禁的 `codex-cli 0.153.0-alpha.5` Runtime，新增协议未自动接入 UI。Plan 使用最小化的局部实验字段适配，Runtime staging 允许新增协议但会阻止当前调用面被删除。
- 最近变更：`codex-cli 0.153.0-alpha.5` 通过协议兼容门禁，确认现有生成文件、RPC、通知和反向请求未被删除或修改；本次未运行 `protocol:generate`，因此保留 `0.152.1` 生成类型基线。置顶从已移除的 `Thread.isPinned` 迁移到原生内置 Pinned Section，没有手改生成类型。
- 当前接口：`src/generated/app-server/v2` 为稳定业务协议类型；Plan 的局部 `CollaborationMode` 仅存在于客户端包装层；JSON-RPC 信封由轻量客户端维护。
- 已知问题：CI 尚未执行兼容门禁；JSON-RPC 信封仍使用本地最小类型；Runtime 新增协议不会自动接入 UI，若现有生成类型发生变化仍需显式重新生成、审查并回归，不得只替换主程序。
- 下一步：把 `check-runtime-compatibility.ps1` 纳入 CI，并在 collaborationMode 转为稳定 API 后删除局部实验适配。
- 验证证据：2026-09-04，`codex-cli 0.153.0-alpha.5` 通过兼容门禁确认现有调用面保留；TypeScript、Vitest、生产构建、Rust check/单测/Clippy 和 NSIS 打包通过，置顶客户端序列化测试确认使用 `thread/section/move`。生成类型仍以 `0.152.1` 为基线。
- 相关决策：[ADR-001：使用原版 Codex app-server](../decisions/ADR-001-unmodified-codex-app-server.md)。
- 最后更新：2026-09-04
