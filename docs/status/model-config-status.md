# 模型配置状态

- 审查结论（2026-09-10，代码尚未修复）：高级设置的 App 回调未更新 activeChannelId，选其他渠道只修改参数并重启原渠道；运行保护只看当前 Session，遗漏后台 Session/侧聊；非激活渠道写 Key 也请求重启；校准会覆盖目录外自定义模型，迟到响应未检查激活渠道是否变化；高级设置选择未加载目录的渠道会把服务层级归一为 default；保存回调不等待 Runtime 重启成功。组件测试通过不代表切换闭环正确。
- 配置边界：catalog.file 只有 schema，既没有 UI，Runtime 也不消费；目录实际按 vendor 决定。配置读取失败被前端忽略。配置与密钥失败一致性见 [凭据状态](credentials-status.md)。上述风险应优先于导入导出或新增厂商修复。
- 模块职责：管理厂商渠道（路由、密钥、模型目录）以及对话内模型、推理强度和原生参数。
- 渠道编辑布局（2026-09-10）：新增/编辑在设置内容区独立展示，取消返回列表；表单输入框使用统一主题样式，设置最大化或最小化不清除未保存字段。未改变密钥、渠道保存与 Runtime 切换逻辑。四尺寸渠道布局脚本与前端 302 项测试通过。
- 当前状态：设置窗口的「模型渠道」分区按厂商分组（OpenAI、DeepSeek）管理渠道，支持新增、编辑、删除、激活和连接测试。渠道 = Base URL + 密钥 + 模型目录 + 该渠道自己的对话参数；同一时刻只有一个激活渠道，所有 Session 共用。对话高级设置只选择渠道，不再输入 Base URL 与 Key。密钥只写入 Windows 凭据管理器，前端只能写入并查询「是否已保存」。模型快捷切换请求同时携带当前 Composer 的 sandboxPolicy、approvalPolicy 和 approvalsReviewer，避免只提交模型字段后由权威设置回流覆盖原权限选择。
- 最近变更：由单 provider 配置改为「厂商分组 + 渠道列表」（settings v2，读取 v1 时自动迁移并保留 `settings.v1.bak.json`）；对话参数从全局一份改为每渠道一份，参数结构按渠道分离，但切换校准仍可能改写模型及服务层级；DeepSeek 渠道启动时注入内置官方模型目录，`model/list` 因此返回 DeepSeek 模型而不是内置 GPT 目录；新增连接测试 `GET {baseUrl}/models`；当前 Session 有回合执行时禁止切换渠道、禁止删除当前生效渠道（后台任务保护缺失），也禁止保存会重启执行核心的渠道改动（新渠道仍可登记）；参数校准只发生在执行核心按新渠道重启之后，并且只写激活渠道。
- 当前接口：`ModelSettingsPanel`、`ProviderChannelsPanel`、`channels.ts`（`activeChannel`、`activeConversation`、`replaceChannel`、`reconcileConversation`、`providerSettingsFromThread`）、`load_model_settings`、`save_model_settings`、`channel_secret_presence`、`save_channel_secret`、`test_channel_connection`、app-server 的 `model/list` 与 provider capability read。
- 已知问题：切换渠道必然重启执行核心，正在执行的回合会被中断（UI 仅保护当前会话，尚未覆盖全部运行任务）；`model/list` 不公开模型的 verbosity 与 reasoning summary 支持状态，通用 UI 无法在选择前可靠禁用不支持项；渠道级代理、超时、重试和并行多 provider 未实现；连接测试只验证路由、密钥与目录，不验证 Responses 对话本身可用；`settings.json` 的 `catalog.file` 仅有 schema，尚无 UI 或 Runtime 消费。
- 下一步：把连接测试扩展为可选的最小对话探测，区分鉴权、模型不存在和参数不兼容；为渠道提供导入导出；评估第三方渠道声明目录之外扩展参数 schema 的协议入口。
- 验证证据：2026-09-10；`pnpm typecheck`、`pnpm lint`、`pnpm test`（62 个文件 / 301 项）、`pnpm build`、`pnpm quality:knip` 通过；`pnpm rust:check` 的 Cargo check、31 项 Rust 单测和严格 Clippy 通过。真实 app-server 探针（Runtime `codex-cli 0.153.4`）：按渠道生成的 `-c` 参数注入 CODEX_HOME 内的 DeepSeek 目录后 `model/list` 只返回 `deepseek-flash`、`deepseek-v4-pro`；同路由去掉 `model_catalog_json` 返回内置 6 个 GPT 模型；OpenAI 渠道不注入目录同样返回内置目录。端点探针确认 `https://api.deepseek.com/models` 与 `.../v1/models` 在无效 Key 下返回 401。未使用真实 DeepSeek 密钥完成一次对话。模型中转渠道设置与对话高级设置已通过 `pnpm test:channel-layout`（Playwright + 本机 Chrome，模拟回调）：1440×900、1280×780、1024×720、900×700 四档均无页面级横向溢出，模态框不越界，可见文字不小于 11px，键盘焦点可进入面板，删除二次确认、Escape 关闭和 reduced-motion 均生效；该脚本挂载真实组件但使用模拟回调，不是真实 Tauri 端到端。
- 相关决策：[ADR-004：以厂商分组的渠道承载模型路由](../decisions/ADR-004-model-provider-channels.md)。
- 最后更新：2026-09-10
