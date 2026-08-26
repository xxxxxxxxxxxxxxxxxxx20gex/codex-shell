# ADR-003：允许通过协议门禁的 Runtime 兼容更新

- 状态：accepted
- 记录日期：2026-08-26
- 影响范围：Runtime 暂存、app-server 协议、桌面打包

## 背景

Codex Runtime 采用快速迭代的 0.x 版本。仅按完整版本号拒绝更新会让 CS 无法使用同源的修复和新增能力；但 app-server 的 RPC、通知和生成类型仍可能发生破坏性变化，不能把“版本号变化”直接当成“协议兼容”。

## 决策

CS 不再要求 Runtime 版本号与历史 manifest 完全相等。`scripts/stage-runtime.ps1` 会从同一来源成套复制主 Runtime 与 companion binaries，读取实际版本和 SHA-256，并运行 `scripts/check-runtime-compatibility.ps1`。门禁要求 CS 当前调用的方法、通知、反向请求和现有生成协议文件仍存在且内容不变；新增协议文件允许暂存，但如果升级改变了生成类型，必须显式运行 `pnpm protocol:generate`、审查差异并完成回归测试。

## 选择理由与未采用方案

兼容性门禁直接检查 CS 的真实协议依赖，比完整版本号比较更接近破坏性变化的实际风险，同时保留对删除方法和反向请求的阻断能力。未采用完全无校验的“永远接受最新 Runtime”，也未采用只比较 semver 主次版本的规则，因为 0.x 上游版本语义不足以证明 JSON-RPC 兼容。

## 后果

- 兼容的 Runtime 更新不再被旧版本号阻塞，manifest 始终记录当前实际版本和哈希。
- 协议新增能力默认不会自动进入 UI；需要运行 `pnpm protocol:generate` 并按代码审查规则接入。
- 当前门禁是必要条件而不是完整契约测试；真实 app-server smoke、类型检查和前端回归仍是升级发布的必需步骤。
- Runtime 与 companion binaries 必须保持同源，不能只替换主 `codex.exe`。

## 关联状态文档

- [Codex Runtime](../status/runtime-status.md)
- [协议与生成类型](../status/protocol-status.md)
- [测试与发布](../status/testing-release-status.md)
