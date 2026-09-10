# 模型配置状态

- 模块职责：管理厂商渠道、路由、目录与渠道独立的对话参数。
- 当前状态：设置中按 OpenAI / DeepSeek 分组管理渠道，支持新增、编辑、删除、激活和 /models 连接测试；所有 Session 共用一个激活渠道。高级设置保存会真正更新 activeChannelId，失败保留编辑器与草稿。
- 渠道选择呈现：高级设置使用 32px 单行选项，显示渠道名、厂商和选中勾选标记，长名称截断并保留完整悬停标题；“管理渠道”独立为标题右侧 28px 无边框跳转按钮，不属于渠道选择组。切换和保存逻辑不变。
- 最近变更：渠道保存串行执行，后端按预期配置检查冲突；需要重启时，提交前检查全部运行 Thread、主会话提交与侧聊提交，暂停新的执行 RPC，等待配置持久化、React 提交、Runtime 重启、目录校准和当前 Thread 参数同步后才成功。重启失败明确提示配置已保存，原样重试仍会重启。删除最后一个渠道只停止 Runtime。非激活渠道更新 Key 不重启。
- 参数边界：目录外非空自定义模型 ID 和参数原样保留；只有空模型选择目录默认项，已知模型校准不支持的推理强度与服务层级。未取得目标目录时不清空服务层级，也不展示其他渠道的 Provider 能力。快捷模型切换保留当前权限和审批设置；切换事务期间忽略恢复过程的旧权威设置回流。
- 配置边界：加载失败显示错误并禁止保存和自动启动，不以空配置覆盖损坏文件。首次读取会持久化初始渠道 ID。catalog.file 暂不支持，读写时明确拒绝，不再静默忽略；OpenAI 使用 Core 内置目录，DeepSeek 使用随应用绑定的目录。
- 当前接口：ModelSettingsPanel、ProviderChannelsPanel、useProviderSettingsSave、channels.ts、load_model_settings、save_model_settings(settings, expected, secretChange)、channel_secret_presence、test_channel_connection、model/list。凭据事务见 [凭据安全](credentials-status.md)。
- 已知问题：仅支持单进程单渠道，不提供并行多 Provider、自动切换或渠道级代理。/models 成功不证明 Responses 对话或工具可用；自定义模型的可用性由实际服务端决定。外部修改配置触发冲突后需重新启动应用读取最新配置。model/list 不公开 verbosity 与 reasoning summary 的完整能力。
- 下一步：人工验证真实系统凭据与多渠道对话切换；可选最小对话探测另行评估，不自动消耗额度。
- 验证证据：2026-09-10；定向回归覆盖高级设置激活 ID、保存失败保留草稿、重启失败重试、切换互斥、执行 RPC 暂停、非激活渠道 Key、自定义模型与未知目录服务层级。四视口布局脚本通过，使用真实组件及模拟回调，不是真实 Tauri 端到端。完整基线见 [测试与发布](testing-release-status.md)。
- 相关决策：[ADR-004](../decisions/ADR-004-model-provider-channels.md)。
- 最后更新：2026-09-10
