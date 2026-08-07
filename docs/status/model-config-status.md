# 模型配置状态

- 模块职责：管理 Base URL、手填模型 ID、能力模板、推理强度与回答冗余度。
- 当前状态：首版 UI、持久化、独立 provider 和 app-server 参数映射已完成；输入框下方模型按钮是唯一配置入口。
- 最近变更：第三方 Base URL 不再覆盖内置 OpenAI provider，而是生成 `codex_shell_gateway` provider；该 provider 使用 Responses wire API 和环境变量 Key，避免宿主 Codex 认证覆盖用户填写的凭据。
- 当前接口：`ModelSettings`、`bundled/model-templates.json`、`MODEL_TEMPLATES`、`load_model_settings`、`save_model_settings`。
- 已知问题：模板尚未由固定 Runtime 自动同步，后端还未主动探测不同兼容端点的参数支持情况。
- 下一步：把已验证的后台连接检查接入设置 UI，并区分鉴权、模型不存在和参数不兼容。
- 验证证据：新网关 `/models` 返回 21 个模型且包含当前 `gpt-5.6-sol`；直接 Responses 与真实 app-server turn 均完成。
- 最后更新：2026-08-07
