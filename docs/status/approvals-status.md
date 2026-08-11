# 审批状态

- 模块职责：接收 app-server 反向请求并让用户批准或拒绝 Shell、文件和权限操作。
- 当前状态：三类审批、工具结构化问答与 MCP elicitation 已统一进入一个 Server Interaction Queue。
- 最近变更：删除旧 `ApprovalDialog` 和审批专用状态；统一 Store 使用 app-server 的真实字符串/数字 request ID，支持最多 32 项排队、密码输入、选项/自由文本、MCP URL、typed form 与 `openai/form`。typed form 会校验数值、字符串格式/长度和多选数量，并省略未填写的可选字段；收到服务端撤销或 Runtime 停止时不发送陈旧响应。
- 当前接口：`ServerInteractionStore`、`ServerInteractionDialog`、`PermissionModeSelector` 和 `onReverseRequest`。
- 已知问题：审批结果尚未作为独立时间线 item 展示；队列暂不显示每项来源 Session 的跳转入口。
- 下一步：增加来源 Session 定位和更友好的日期、日期时间等专用输入控件。
- 验证证据：Store 和 happy-dom 测试覆盖响应形状、服务端撤销、清空、有界队列、多选数组、可选字段省略、schema 约束与不安全 URL；JSON-RPC 测试覆盖真实 request ID 和 dismiss 后不发响应。
- 最后更新：2026-08-11
