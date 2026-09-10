# ADR-004：以厂商分组的渠道承载模型路由，并把对话参数归属到渠道

- 状态：accepted
- 记录日期：2026-09-10
- 影响范围：模型配置、凭据、Runtime 启动参数、设置 UI

## 背景

- 单一 provider 配置只能表达「一个地址 + 一个密钥 + 一份参数」，既无法表达同一厂商的多条路由（官方直连、中转站、备用 Key），也无法接入 DeepSeek 这类非 OpenAI 官方模型。
- 「只支持几个 GPT 模型」的原因不是协议限制：CS 从不设置 `model_catalog_json`，所以 `model/list` 始终返回 Codex Core 的内置目录。该结论已用真实 app-server 实测确认（`design-plans/model-channels-v1.md` §2.2）。
- 用户在高级设置里反复输入 Base URL 与 API Key；切换目标后，之前的参数还会被覆盖。
- 安全边界不变：密钥只能进 Windows 凭据管理器、前端不可回读；`codex app-server` 是唯一执行核心，provider 是进程级属性。

## 决策

1. 引入两层领域模型：**Vendor**（代码内常量表：`openai`、`deepseek`）与 **Channel**（用户数据：`id`、`vendor`、`name`、`baseUrl`、`catalog`、`conversation`）。设置中按厂商分组渲染渠道列表。
2. **对话参数归属渠道**：`conversation`（`modelId`、推理强度、推理摘要、回答冗余度、服务层级）保存在每个渠道内部，切换渠道只是切换使用哪一份。
3. 密钥按渠道 `id` 存进单条 keyring 记录的 JSON 映射；前端只有写入命令，以及只返回渠道 id 列表的「是否已保存」查询。
4. 模型目录来源挂在渠道上。DeepSeek 使用随应用编译的官方目录，启动时物化到 `<CODEX_HOME>/codex-shell/` 并写入 `model_catalog_json`；OpenAI 渠道不注入该参数。
5. 同一时刻只有一个激活渠道，切换渠道重启 app-server。
6. 切换后按新渠道目录校准参数，且校准只写激活渠道；有回合正在执行时禁止切换。
7. 「测试连接」实现为 `GET {baseUrl}/models`，只验证路由、密钥和目录可达性，不发送推理请求。

## 选择理由与未采用方案

- **未采用「设置里并排 OpenAI / DeepSeek 两个栏目」**：硬编码厂商在引入第三个厂商时必然返工，且表达不了同厂商多渠道；分组列表天然可扩展。
- **未采用顶层全局 `conversation`（初稿方案）**：切换渠道后切回来会丢失上一个渠道调好的参数，直接违反「切换不影响 GPT 参数」的验收要求。
- **未采用每渠道一个环境变量名**：会把渠道数量泄漏到子进程环境。
- **未采用多 provider 并行**：需要按 provider 启动第二个 app-server 并重构前端单连接假设，是独立架构改动，v1 明确不做。
- **未采用 DeepSeek 文档的 `experimental_bearer_token` 明文写法**：违反密钥边界；实测 `env_key=OPENAI_API_KEY` 注入可用。
- **未在前端执行连接测试**：前端无法读取已保存密钥，只能拿到用户当场输入的那一份。
- **未把目录落到 CODEX_HOME 之外**：`model_catalog_json` 指向外部路径尚未实测，落在 CODEX_HOME 内可以规避该未知项。

## 后果

- 新增厂商 = 改常量表 + 增加目录文件；新增渠道不再需要改代码。
- 渠道切换有 app-server 重启成本，UI 必须显式表达并在有任务执行时阻止。
- 内置第三方目录需要跟随上游维护，目录来源与获取日期必须记录。
- 单条 keyring 记录承载全部渠道密钥，受系统凭据容量限制，写入必须串行化。
- 同一时刻仍然只能有一个 provider，v1 不支持并行多厂商会话。
- 连接测试只覆盖路由与密钥，不保证 Responses 对话一定成功。

## 关联状态文档

- [模型配置](../status/model-config-status.md)
- [凭据安全](../status/credentials-status.md)
- [Codex Runtime](../status/runtime-status.md)
- [桌面 UI 壳](../status/ui-shell-status.md)
