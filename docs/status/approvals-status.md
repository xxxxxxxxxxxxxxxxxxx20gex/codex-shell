# 审批状态

- 模块职责：接收 app-server 反向请求并让用户批准或拒绝 Shell、文件和权限操作。
- 当前状态：三类审批、工具结构化问答与 MCP elicitation 已统一进入一个 Server Interaction Queue；新启动的 UI 默认使用“完全访问”。
- 最近变更：主权限收敛为只读、工作区写入、完全访问三档，分别原生映射 `readOnly`、`workspaceWrite`、`dangerFullAccess`；默认仍为完全访问，对应 `approvalPolicy=never`。审批者从沙盒范围中解耦，只读和工作区写入可独立启用 `auto_review`，完全访问强制使用 `user` 且不触发审批。普通发送和 Queue 都快照沙盒与审批者，下一轮通过 `turn/start` 原子生效，不新建 Session。
- 当前接口：`ServerInteractionStore`、`ServerInteractionDialog`、`PermissionModeSelector` 和 `onReverseRequest`。
- 已知问题：审批结果尚未作为独立时间线 item 展示；队列暂不显示每项来源 Session 的跳转入口。
- 下一步：增加来源 Session 定位和更友好的日期、日期时间等专用输入控件。
- 验证证据：Store 和 happy-dom 测试覆盖响应形状、服务端撤销、清空、有界队列、多选数组、可选字段省略、schema 约束与不安全 URL；权限测试覆盖三档菜单、自动审查开关、Thread/Turn 双层原生沙盒字段、审批者解耦、完全访问强制无审批、Queue 快照及降权后保持同一 Session。
- 最后更新：2026-08-14
