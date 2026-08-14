# 模型配置状态

- 模块职责：管理对话内模型/推理强度热切换，以及高级网关、密钥、自定义模型和模型特有参数。
- 当前状态：输入框旁提供 Codex 风格轻量模型菜单；高级设置独立承载第三方网关与扩展参数。
- 最近变更：Base URL 与自定义模型 ID 在前端提交和 Rust 读写边界都会去除首尾空白，校验、重启比较、前端回传和持久化使用同一规范化对象；旧配置读取时也会自动规范化。模型列表和推理强度继续复用 app-server `model/list`，参数热切换不新建 Session。
- 当前接口：`ModelQuickPicker`、`ModelSettingsPanel`、`ModelSettings`、`model/list`、Provider capability read、Windows Credential Manager 持久化接口。
- 已知问题：更改 Base URL 或 API Key 后需要重启连接才能让 Provider 与原生目录同步；第三方 Provider 尚无声明任意扩展参数 schema 的协议。
- 下一步：增加显式连接测试和兼容性诊断，区分鉴权、模型不存在和参数不兼容。
- 验证证据：DOM 测试确认带空白的 Base URL/模型 ID 会以完整规范化对象回传，Rust 测试确认配置边界输出规范化对象；既有测试继续覆盖原生模型目录、推理强度、无模板网关参数和 Thread 内热切换。
- 最后更新：2026-08-14
