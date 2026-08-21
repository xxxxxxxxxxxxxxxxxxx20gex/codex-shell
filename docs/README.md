# Codex Shell 文档地图

本目录只保存未来开发需要持续维护的项目知识。文档职责和同步门禁以 [AGENTS.md](../AGENTS.md) 为准；本页只提供导航和最小格式，不建立第二套规则。

## 关系

```text
AGENTS.md                         长期规则、硬边界、文档治理
├── README.md                     使用者入口
├── DESIGN.md                     UI 设计契约
├── docs/status/PROJECT_STATUS.md 跨模块当前快照
├── docs/status/*-status.md       单模块当前事实
├── docs/decisions/ADR-*.md       重要决策及原因
└── design-plans/                 尚未落地的目标方案

Git                              历史、旧状态和完成过程
```

AI 处理任务时从 `AGENTS.md` 开始，只继续读取与任务直接相关的契约、模块状态和 ADR，不默认加载全部文档。

## 当前状态

- [项目总状态](status/PROJECT_STATUS.md)
- [Codex Runtime](status/runtime-status.md)
- [app-server 客户端](status/app-server-client-status.md)
- [协议与生成类型](status/protocol-status.md)
- [凭据安全](status/credentials-status.md)
- [模型配置](status/model-config-status.md)
- [工作区与线程](status/workspace-thread-status.md)
- [智能体命令与扩展能力](status/agent-capabilities-status.md)
- [任务时间线](status/timeline-status.md)
- [审批](status/approvals-status.md)
- [Diff 与文件变更](status/diff-status.md)
- [桌面 UI 壳](status/ui-shell-status.md)
- [测试与发布](status/testing-release-status.md)

## 重要决策

- [ADR-001：使用原版 Codex app-server 作为唯一执行核心](decisions/ADR-001-unmodified-codex-app-server.md)
- [ADR-002：隔离 Codex Shell 的运行数据与凭据](decisions/ADR-002-isolated-runtime-data.md)

## 模块状态模板

现有状态文档保持短小，并使用以下字段：

```markdown
# <模块名>状态

- 模块职责：一句话说明稳定边界。
- 当前状态：当前已实现能力和未完成边界。
- 最近变更：最近一次有意义的行为变化，不写流水账。
- 当前接口：关键入口、数据流或对外约束。
- 已知问题：当前仍成立且可行动的问题；没有则写“无已知阻塞”。
- 下一步：最接近当前状态的 1-3 项，不写愿望清单。
- 验证证据：YYYY-MM-DD；实际命令或探针、结果和覆盖范围。
- 相关决策：可选，只链接直接相关 ADR。
- 最后更新：YYYY-MM-DD
```

## ADR 准入与模板

仅当决策影响长期架构、安全边界、数据归属、核心协议或跨模块协作，并且代价较高或未来可能再次被质疑时，才新增 ADR。局部重构、普通库选择和可由源码重建的事实不写 ADR。

```markdown
# ADR-NNN：标题

- 状态：proposed | accepted | superseded
- 记录日期：YYYY-MM-DD
- 影响范围：模块或边界

## 背景

## 决策

## 选择理由与未采用方案

## 后果

## 关联状态文档
```
