# 模型配置状态

- 模块职责：管理对话内模型/推理强度热切换，以及高级网关、密钥、自定义模型和模型特有参数。
- 当前状态：输入框旁提供 Codex 风格轻量模型菜单；高级设置独立承载第三方网关与扩展参数。
- 最近变更：增加脱敏的真实上游参数探针，固定 Runtime 会经本地捕获代理把请求继续转发到用户网关，并硬断言模型 ID、推理强度、回答冗余度、HTTP 2xx 与 Core ignored warning。推理强度按钮保留 app-server 原生说明；高级设置明确提示冗余度仅在模型支持时生效且需要重启连接。
- 当前接口：`ModelQuickPicker`、`ModelSettingsPanel`、`ModelSettings`、`model/list`、Provider capability read、Windows Credential Manager 持久化接口。
- 已知问题：更改 Base URL、API Key 或回答冗余度后需要重启连接；`model/list` 不公开模型的 verbosity 支持状态，因此通用 UI 无法在选择前可靠禁用不支持的冗余度，第三方 Provider 也尚无声明任意扩展参数 schema 的协议。
- 下一步：把参数探针包装为桌面端显式“连接与兼容性测试”，并消费 Core 的 verbosity ignored 诊断，区分鉴权、模型不存在和参数不兼容。
- 验证证据：2026-08-19 使用固定 `codex-cli 0.146.0-alpha.9.2` 与当前网关对 `gpt-5.6-sol` 实测：low/medium/high/xhigh/max 推理强度均原样进入 `/v1/responses`，ultra 按 Core 设计映射为线上 max 并在本地启用 proactive multi-agent；low/medium/high verbosity 均进入 `text.verbosity`；所有实测请求 HTTP 200，未出现 verbosity ignored warning。探针不输出密钥、提示词或响应正文。
- 最后更新：2026-08-19
