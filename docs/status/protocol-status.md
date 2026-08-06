# 协议与生成类型状态

- 模块职责：锁定 app-server v2 线协议并提供匹配 Runtime 的 TypeScript 类型。
- 当前状态：稳定协议类型已经由固定 Runtime 生成。
- 最近变更：增加生成脚本，并由 staged `codex-cli 0.146.0-alpha.9.2` 生成 622 个 TypeScript 协议文件。
- 当前接口：`src/generated/app-server/v2` 为业务协议类型；JSON-RPC 信封由轻量客户端维护。
- 已知问题：尚未增加 CI drift 检查，JSON-RPC 信封仍使用本地最小类型。
- 下一步：接入生成的 Thread/Turn/Item 类型并增加生成产物 drift 校验。
- 验证证据：`pnpm protocol:generate` 成功完成，未启用 experimental 参数。
- 最后更新：2026-08-06
