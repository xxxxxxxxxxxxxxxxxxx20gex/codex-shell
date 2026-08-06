# app-server 客户端状态

- 模块职责：维护双向 JSON-RPC 请求、响应、通知和反向请求。
- 当前状态：基础客户端完成，尚未接入 UI。
- 最近变更：实现请求关联、通知订阅、反向请求处理及 initialize 握手，并接入固定 Runtime 生成的线程/回合类型。
- 当前接口：`start`、`stop`、`request`、`notify`、`startThread`、`resumeThread`、`startTurn`、`interruptTurn`、`onNotification`、`onReverseRequest`。
- 已知问题：缺少请求超时、断线恢复和协议级测试。
- 下一步：接入线程与审批 store，增加伪 app-server 测试。
- 验证证据：TypeScript 类型检查待执行。
- 最后更新：2026-08-06
