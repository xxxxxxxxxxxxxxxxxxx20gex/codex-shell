# 模型配置状态

- 模块职责：管理对话内模型/推理强度热切换，以及高级网关、密钥、自定义模型和模型特有参数。
- 当前状态：输入框旁提供 Codex 风格轻量模型菜单；高级设置独立承载第三方网关与扩展参数。
- 最近变更：移除用户可见及 Runtime 配置中的能力模板，删除静态模板目录；模型列表和推理强度复用 app-server `model/list` 元数据，桌面快捷选择器按产品要求隐藏 GPT-5.2 模型族，但不修改服务端目录、历史 Session 或高级自定义模型配置。模型、自定义模型 ID和推理强度直接更新后续 `turn/start`，不重启、不清空 Thread；Base URL、API Key 或回答冗余度改变时才重启 app-server，重启后只读恢复当前 Thread，任何参数切换都不会新建 Session。
- 当前接口：`ModelQuickPicker`、`ModelSettingsPanel`、`ModelSettings`、`model/list`、Provider capability read、Windows Credential Manager 持久化接口。
- 已知问题：更改 Base URL 或 API Key 后需要重启连接才能让 Provider 与原生目录同步；第三方 Provider 尚无声明任意扩展参数 schema 的协议。
- 下一步：增加显式连接测试和保存前兼容性诊断，区分鉴权、模型不存在和参数不兼容。
- 验证证据：DOM 测试确认 GPT-5.2 模型族不进入桌面快捷列表，其余原生模型、服务端推理强度和高级入口可独立操作且无模板 UI；Hook 测试确认模型覆盖继续使用当前 Thread，Runtime 重启恢复后下一轮也不调用 `thread/start`；Rust 测试覆盖无模板的网关、推理强度和冗余度启动参数；已有第三方网关真实 app-server Turn 验证继续有效。
- 最后更新：2026-08-13
