# 审批状态

- 模块职责：接收 app-server 反向请求并让用户批准或拒绝 Shell、文件和权限操作。
- 当前状态：三类审批、工具结构化问答与 MCP elicitation 已统一进入一个 Server Interaction Queue；新启动的 UI 默认使用“完全访问权限”。
- 最近变更：默认权限模式为 `full`，对应 app-server 的 `approvalPolicy=never` 与 `sandbox=danger-full-access`。权限切换不再创建新 Session，运行中的 Turn 也可为下一条新输入预选权限；三档模式都在下一次原生 `turn/start` 中原子发送审批策略、审批者与完整沙盒策略，修复从完全访问切回工作区权限时 app-server 沿用旧沙盒的问题。Resume 只恢复 Thread，不再提前改写权限。
- 当前接口：`ServerInteractionStore`、`ServerInteractionDialog`、`PermissionModeSelector` 和 `onReverseRequest`。
- 已知问题：审批结果尚未作为独立时间线 item 展示；队列暂不显示每项来源 Session 的跳转入口。
- 下一步：增加来源 Session 定位和更友好的日期、日期时间等专用输入控件。
- 验证证据：Store 和 happy-dom 测试覆盖响应形状、服务端撤销、清空、有界队列、多选数组、可选字段省略、schema 约束与不安全 URL；权限映射测试覆盖 `full → dangerFullAccess` 与 `ask/auto → workspaceWrite`，Thread 控制器测试验证 Resume 无覆盖、Turn 原子覆盖及降权后保持同一 Session。
- 最后更新：2026-08-12
