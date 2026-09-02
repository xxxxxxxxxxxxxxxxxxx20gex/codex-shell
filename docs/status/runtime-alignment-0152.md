# Codex Runtime 0.152.x 对齐记录

CS 使用暂存 Runtime 生成的 app-server 协议，当前基线为 `codex-cli 0.152.1`。本文件只记录已经由协议和代码证实的能力，不把实验接口描述成已启用的 UI 功能。

## 对齐范围

1. **队列与引导**：排队消息通过 `thread/queue/add` 写入 app-server，并消费 `thread/queue/changed`；删除和“继续发送”分别使用原生 delete/start。CS 本地只保留客户端消息 ID 关联的展示元数据（模型、权限、Skill、模式），避免协议不支持这些字段时丢失 UI 信息。运行在不含 queue 接口的旧 Runtime 时才回退到本地调度。`turn/steer` 仍直接复用 app-server。
2. **分页历史**：打开 Session 使用 `thread/read(includeTurns=false)` + `thread/turns/list(itemsView=full)`，最多载入最近 200 个 turn；把只读 Session 恢复为可执行状态时使用 `thread/resume(excludeTurns=true)`，避免再次要求完整历史并触发弃用警告。旧 Runtime 或不支持分页时才回退到 `thread/read(includeTurns=true)`。
3. **动态设置**：模型、推理强度、推理摘要、服务层级、审批策略和沙箱策略通过 `thread/settings/update` 同步到当前 Session；运行中的 turn 同步尝试 `turn/settings/update`。Base URL、凭证和 verbosity 仍属于连接级配置，不能伪装成 turn 设置。
4. **Goal/Plan**：Goal 使用 `thread/goal/*` 及通知；Plan 使用原生 collaboration mode 和 `turn/plan/updated`，两者互斥逻辑由 Composer 保持。`tools.update_plan.enabled` 仅控制 TODO/checklist 工具，不参与 Plan collaboration mode；CS 不再读取这个无消费方的诊断字段，Plan 能力直接遵循 app-server 的原生 collaboration mode。
5. **Token/压缩**：消费 `thread/tokenUsage/updated` 与 `thread/compacted`；压缩阈值由 Runtime 决定，CS 不硬编码上下文窗口。
6. **执行中间态**：消费 reasoning、command execution、file change、MCP progress、approval 和 turn 状态通知，保持在对应 Session/turn 范围内。
7. **资源产出**：消费原生 image generation/file change item；图片进入本轮产出预览，非图片资源只保留索引并支持资源管理器定位。

## 兼容性规则

- `scripts/check-runtime-compatibility.ps1` 必须先通过，确认现有请求、通知、反向请求仍存在。
- 新接口封装不代表 UI 已自动启用；只有完成端到端行为测试后才可替换现有调度。
- 队列协议不携带模型、权限和协作模式等 CS 扩展字段，禁止把这些字段伪造塞入 `UserInput`；使用 `clientUserMessageId` 做本地元数据关联。
- 每次 Runtime 更新后重新执行 `pnpm runtime:stage`、`pnpm protocol:generate`、`pnpm test:quality`，并审查生成协议 diff。
