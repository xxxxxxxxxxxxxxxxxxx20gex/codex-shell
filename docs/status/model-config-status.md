# 模型配置状态

- 模块职责：管理对话内模型/推理强度热切换，以及高级网关、密钥、自定义模型和模型特有参数。
- 当前状态：输入框旁提供 Codex 风格轻量模型菜单；高级设置独立承载第三方网关，以及 Codex Core 确实允许壳子控制的推理摘要、回答冗余度和服务层级。
- 最近变更：高级设置新增原生 `reasoning.summary` 与 `service_tier`；服务层级只显示 `model/list` 为当前模型声明的选项，不支持的已保存值会回退标准层级。推理强度、推理摘要和回答冗余度的新安装默认值均改为不覆盖 Core/模型目录；旧配置中的显式选择继续保留。`temperature`、`top_p`、`max_output_tokens`、工具选择、并行工具调用、缓存键、流式传输和存储策略没有可用的 Codex Core 壳层入口，因此不制造无效设置。
- 当前接口：`ModelQuickPicker`、`ModelSettingsPanel`、`ModelSettings`、`model/list`、Provider capability read、Windows Credential Manager 持久化接口。
- 已知问题：更改 Base URL、API Key 或回答冗余度后需要重启连接；`model/list` 不公开模型的 verbosity 和 reasoning summary 支持状态，因此通用 UI 无法在选择前可靠禁用不支持项，第三方 Provider 也尚无声明任意扩展参数 schema 的协议。
- 下一步：把参数探针包装为桌面端显式“连接与兼容性测试”，并消费 Core 的 verbosity ignored 诊断，区分鉴权、模型不存在和参数不兼容。
- 验证证据：2026-08-19 使用固定 `codex-cli 0.146.0-alpha.9.2` 与当前网关对 `gpt-5.6-sol` 实测：low/medium/high/xhigh/max 推理强度均原样进入 `/v1/responses`，ultra 按 Core 设计映射为线上 max；low/medium/high verbosity 均进入 `text.verbosity`；auto/concise/detailed 摘要原样进入 `reasoning.summary`，none 省略该字段；模型目录只声明 Priority，选择后上游收到 `service_tier=priority`，标准层级省略该字段。所有实测请求 HTTP 200，未出现 verbosity ignored warning。探针不输出密钥、提示词或响应正文。
- 最后更新：2026-08-19
