# 模型配置状态

- 模块职责：管理厂商渠道、路由、目录与渠道独立的对话参数。
- 当前状态：设置中按 OpenAI / DeepSeek 分组管理渠道，支持新增、编辑、删除、激活和 /models 连接测试；所有 Session 共用一个激活渠道。高级设置保存会真正更新 activeChannelId，失败保留编辑器与草稿。
- OpenAI 模型选择：在 Core 返回目录之外补充 `gpt-6-sol` 与 `gpt-6.1-sol` 两个 CS 内置模型 ID；仅 OpenAI 渠道显示，重复目录项不会重复添加。
- 渠道选择呈现：高级设置使用 32px 单行选项，显示渠道名、厂商和选中勾选标记，长名称截断并保留完整悬停标题；“管理渠道”独立为标题右侧 28px 无边框跳转按钮，不属于渠道选择组。切换和保存逻辑不变。
- 最近变更：快速切换模型时按目标模型的 `serviceTiers` 校准服务层级，不支持的 `priority`／`flex` 回退为 `default`；Core 对当前模型明确声明“服务层级已从请求中省略”的提示不再弹出，其他警告保留。目录外自定义模型 ID 原样保存、传递和显示；高级设置仅保留渠道、模型 ID、推理摘要、回答冗余度和服务层级选项。渠道保存串行执行，后端按预期配置检查冲突；需要重启时，提交前检查全部运行 Thread、主会话提交与侧聊提交，暂停新的执行 RPC，等待配置持久化、React 提交、Runtime 重启、目录校准和当前 Thread 参数同步后才成功。重启失败明确提示配置已保存，原样重试仍会重启。删除最后一个渠道只停止 Runtime。非激活渠道更新 Key 不重启。
- 参数边界：目录外非空自定义模型 ID 和参数原样保留；只有空模型选择目录默认项，已知模型校准不支持的推理强度与服务层级。未取得目标目录时不清空服务层级，也不展示其他渠道的 Provider 能力。快捷模型切换保留当前权限和审批设置；切换事务期间忽略恢复过程的旧权威设置回流。
- 配置边界：加载失败显示错误并禁止保存和自动启动，不以空配置覆盖损坏文件。首次读取会持久化初始渠道 ID。catalog.file 暂不支持，读写时明确拒绝，不再静默忽略；OpenAI 使用 Core 内置目录，DeepSeek 使用随应用绑定的目录。
- 当前接口：ModelSettingsPanel、ProviderChannelsPanel、useProviderSettingsSave、channels.ts、load_model_settings、save_model_settings(settings, expected, secretChange)、channel_secret_presence、test_channel_connection、model/list。凭据事务见 [凭据安全](credentials-status.md)。
- 安全边界：渠道 Base URL 只接受 HTTPS；本机调试允许 localhost、127.0.0.1 和 ::1 的 HTTP。连接探针与 app-server 启动共用该边界，避免把 API Key 发往公网明文地址。
- 已知问题：仅支持单进程单渠道，不提供并行多 Provider、自动切换或渠道级代理。/models 成功不证明 Responses 对话或工具可用；自定义模型的可用性由实际服务端决定。外部修改配置触发冲突后需重新启动应用读取最新配置。model/list 不公开 verbosity 与 reasoning summary 的完整能力。
- 下一步：人工验证真实系统凭据与多渠道对话切换；可选最小对话探测另行评估，不自动消耗额度。
- 相关决策：[ADR-004](../decisions/ADR-004-model-provider-channels.md)。
- 验证证据：2026-10-01；快速切换回归覆盖目标模型支持和不支持 `priority` 两种路径；提示回归只过滤当前模型的省略通知。模型／Runtime 定向测试 25 项、全量前端 370 项、ESLint、TypeScript、Cargo check 和 Debug 构建通过。真实模型请求尚未复测；四视口布局和真实系统凭据仍按 [测试与发布](testing-release-status.md) 的边界执行。
- 最后更新：2026-10-01
