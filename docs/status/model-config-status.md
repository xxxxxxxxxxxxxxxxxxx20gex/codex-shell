# 模型配置状态

- 模块职责：管理 Base URL、手填模型 ID、能力模板、推理强度与回答冗余度。
- 当前状态：首版 UI 与数据类型已完成。
- 最近变更：内置 GPT-5.6/5.5/5.4/5.2 主流模板和基础兼容模板；模型 ID 与能力模板解耦；进程启动时按模板决定是否注入 reasoning/verbosity 默认值。
- 当前接口：`ModelSettings`、`bundled/model-templates.json`、`MODEL_TEMPLATES`、`load_model_settings`、`save_model_settings`。
- 已知问题：模板已有独立版本化 JSON，但尚未由固定 Runtime 自动同步。
- 下一步：从 Runtime 模型目录生成版本化 JSON，并对无效模板参数做后端校验。
- 验证证据：模板仅在显式支持时展示 reasoning/verbosity 控件。
- 最后更新：2026-08-06
