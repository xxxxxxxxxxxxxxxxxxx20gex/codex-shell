# 协议与生成类型状态

- 模块职责：维护 app-server v2 调用面、生成类型和兼容门禁。
- 当前状态：main 的 875 个生成类型文件与 `codex-cli 0.159.2` 的 `generate-ts --experimental` 对齐；公开 v0.1.9 仍使用旧内核。初始化保留 `experimentalApi: true`，不自动接入新增产品能力。
- 最近变更：删除已被上游移除的 `thread/rollback` 及两个生成类型；消息编辑使用 `thread/revert` 返回的 metadata 和 backwards cursor 分页获取保留历史；本地主动回退消费对应通知而不重复读取，外部回退刷新受会话和代际校验约束。同步模型、MCP、Thread settings 和图片 `fileId` 类型。已有通知消费保持，新增 `account/gatewayOAuth/changed` 与 `thread/attachment/updated` 无对应 CS 产品状态，暂不订阅。
- 生成流程：`pnpm protocol:generate -Runtime <候选 exe>` 先在临时目录完整生成，再同步生成目录并移除候选已删除的生成文件；不替换 Runtime。完成适配及回归后，`pnpm runtime:stage -Source <同一候选 exe>` 仍检查 100 处字面量调用／订阅及全部现有生成文件，不提供跳过门禁选项。
- 历史语义：0.159.2 的真实分页、回退、分叉与冷恢复已由隔离探针验证。`turn/start` 返回并不保证首轮已经持久化，探针需等待模拟网关收到请求后再验证运行中历史；此前将即时 `list_turns is not supported yet` 一概视为版本不支持分页的结论不再成立。Shell 只对明确的未持久化／历史不可读错误尝试原生读取或恢复，不把网络等任意失败隐藏成全量历史降级。
- 实验边界：为保留 legacy 会话编辑能力，在 Rust 启动参数中开启官方 `background_paginated_rollout_migration`；参数单测、CLI 迁移和启动后台迁移均有真实隔离证据。数据格式与回退边界见 [ADR-005](../decisions/ADR-005-native-history-migration.md)。
- 已知问题：`turn/settings/update` 默认仍受 `step_model_switching` 限制，不能承诺当前运行回合立即换模；AST 门禁只覆盖字面量调用，不能替代真实协议探针。无 CI 门禁。
- 产品边界：新 `ThreadAttachment` 是 JSON 元数据接口，本轮不替换本地图片存储，也不假定 Core 会管理图片文件回收。账户、Gateway OAuth、Connector、插件市场及实时音频不接入。
- 验证证据：2026-10-01；同源暂存兼容门禁、`runtime:probe-protocol`、`runtime:probe-upgrade`（旧内核生成 fixture、官方 CLI／后台迁移、新旧历史恢复、分页、回退替换、普通分叉、临时侧聊分叉与发送、归档、队列及通知）通过。全部模型请求仅到本机模拟 Responses 网关，无真实账号或用户 Session；完整基线见 [测试与发布](testing-release-status.md)。
- 下一步：真实 WebView2 的历史编辑与大型旧库迁移验收，再单独评估运行回合模型切换。
- 相关决策：[ADR-001](../decisions/ADR-001-unmodified-codex-app-server.md)、[ADR-003](../decisions/ADR-003-compatible-runtime-updates.md)。
- 最后更新：2026-10-01
