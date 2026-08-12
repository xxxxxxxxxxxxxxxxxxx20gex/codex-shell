# 模型配置状态

- 模块职责：管理 Base URL、手填模型 ID、能力模板、推理强度与回答冗余度。
- 当前状态：手填第三方网关配置和 app-server 原生模型目录已合并到唯一模型设置入口。
- 最近变更：接入 `model/list` 游标分页与 `modelProvider/capabilities/read`；原生目录显示名称、描述、输入模态并保留服务端声明的任意推理强度。已有 Session 可热切换模型和推理强度，下一轮通过原生 `turn/start` 覆盖生效；Base URL、API Key、能力模板或回答冗余度改变时会重启 app-server，因为这些配置由进程启动参数提供，但重启后会只读恢复当前 Thread，不再把下一条消息误建为新 Session。
- 当前接口：`ModelSettings`、模型模板、`model/list`、Provider capability read、Windows Credential Manager 持久化接口。
- 已知问题：更改 Base URL 或 API Key 后需要重启连接才能让 Provider 与原生目录同步；模板尚未自动同步固定 Runtime 元数据。
- 下一步：增加显式连接测试和保存前兼容性诊断，区分鉴权、模型不存在和参数不兼容。
- 验证证据：类型检查和 happy-dom 测试确认模型目录、隐藏模型过滤、手填 fallback、原生默认值和自定义 reasoning effort 均可正确保存；Hook 测试确认 Runtime 重启恢复后下一轮继续使用原 Thread ID 且不调用 `thread/start`；已有第三方网关真实 app-server Turn 验证继续有效。
- 最后更新：2026-08-12
