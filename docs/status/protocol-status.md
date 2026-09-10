# 协议与生成类型状态

- 模块职责：维护 app-server v2 协议依赖、兼容性门禁并提供由 Runtime 生成的 TypeScript 类型。
- 当前状态：生成类型与暂存 Runtime 均为 codex-cli 0.153.4；生成与兼容门禁统一使用 generate-ts --experimental，对应客户端初始化的 experimentalApi: true。导出实验类型不代表启用全部实验功能。
- 最近变更：修正稳定导出与实际实验调用不一致的门禁，重新生成完整协议，补齐 Thread 元数据、ThreadSettings 和 agentMessage 可空字段。移除废弃 thread/compacted 消费，保留生成类型及历史兼容；压缩由 canonical contextCompaction Item 表示。
- 当前接口：appServerClient 封装 Thread/Turn 设置、历史、队列等 RPC；Plan 保留局部最小参数适配。check-protocol-surface.mjs 用 TypeScript AST 检查生产源码中的字面量请求、通知与反向请求，排除 Tauri 本地 app-server/stopped；兼容门禁另外比较全部现有生成文件，忽略 CRLF/LF 差异但保留大小写敏感检查。
- 已知问题：静态协议存在不等于运行功能可用。隔离 Runtime 探针中 thread/turns/list 返回 list_turns is not supported yet；turn/settings/update 默认被 step_model_switching 功能门禁拒绝，运行中换模型不能承诺生效。AST 检查只覆盖字面量调用；动态构造方法和真实运行语义仍需定向测试。CI 尚未执行兼容门禁。
- 下一步：单独完善运行中模型设置的能力判断和失败呈现；验证可用的历史后端后再宣称真实分页支持，不通过导出类型推断能力。
- 门禁回归：pnpm test:protocol-surface 验证当前调用面通过，并模拟删除 thread/queue/changed 后必须失败；真实 PowerShell 门禁同时验证 CRLF 基线与 LF 候选的兼容比较。
- 验证证据：2026-09-11；当前 Runtime 通过修复后的兼容门禁（106 处字面量调用与订阅）；Vitest 覆盖最近 200 轮跨页顺序、队列通知合并及 reset 后迟到响应、canonical 压缩 Item 与退订。pnpm runtime:probe-protocol 使用临时 CODEX_HOME、假密钥及本机模拟网关，验证 Thread 设置、队列增删查及通知、元数据读取，同时断言上述功能限制；不代表真实模型对话或运行中换模通过。
- 相关决策：[ADR-001](../decisions/ADR-001-unmodified-codex-app-server.md)、[ADR-003](../decisions/ADR-003-compatible-runtime-updates.md)。
- 最后更新：2026-09-11
