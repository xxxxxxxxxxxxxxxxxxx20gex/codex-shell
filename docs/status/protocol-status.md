# 协议与生成类型状态

- 模块职责：锁定 app-server v2 线协议并提供匹配 Runtime 的 TypeScript 类型。
- 当前状态：稳定协议类型由固定 Runtime 生成；Plan 使用最小化的局部实验字段适配。
- 最近变更：普通本地文件不再错误映射为资源 `mention`；Shell 在原生 `text` 中携带绝对路径，并使用 UTF-8 byte range 的 `text_elements` 保存文件名和路径范围。图片继续使用固定协议提供的 `localImage`/`image`，没有扩展或修改生成协议。
- 当前接口：`src/generated/app-server/v2` 为稳定业务协议类型；Plan 的局部 `CollaborationMode` 仅存在于客户端包装层；JSON-RPC 信封由轻量客户端维护。
- 已知问题：尚未增加 CI drift 检查，JSON-RPC 信封仍使用本地最小类型；当前 Codex 源码已出现固定 Runtime `0.146.0-alpha.9.2` 未提供的新方法，升级 Runtime 前不得按源码最新版盲目接入。
- 下一步：增加生成产物 drift 校验，并在 collaborationMode 转为稳定 API 后删除局部实验适配。
- 验证证据：序列化测试覆盖 initialize 能力和 Plan turn 精确请求体；附件输入测试覆盖 ASCII/中文路径的 UTF-8 byte range、图片原生输入和 Skill 共存。固定 Runtime 的真实 Plan Turn 已完成，稳定 schema 仍由 `pnpm protocol:generate` 维护。
- 最后更新：2026-08-14
