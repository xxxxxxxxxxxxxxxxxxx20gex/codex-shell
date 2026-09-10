# 模型厂商与渠道 v1（目标方案）

> 本方案已于 2026-09-10 落地。本文保留目标状态、迁移步骤和落地时对草案的修正；当前行为以源码和 [模型配置状态](../docs/status/model-config-status.md) 为准，本文不作为完成状态证据。

- 记录日期：2026-09-10
- 影响模块：`models`、`preferences`、`config`、`credentials`、`app_server`、`runtime`
- 相关契约：[DESIGN.md](../DESIGN.md)、[AGENTS.md](../AGENTS.md)、[ADR-001](../docs/decisions/ADR-001-unmodified-codex-app-server.md)、[ADR-002](../docs/decisions/ADR-002-isolated-runtime-data.md)

## 1 目标与非目标

### 1.1 目标

1. 设置中按**厂商**分组管理**渠道**；渠道 = 路由（Base URL）+ 密钥 + 模型目录，支持新增、编辑、删除。
2. 对话高级设置只选择渠道，不再重复输入 Base URL 与 API Key。
3. 切换式生效：全局同一时刻只有一个激活渠道，所有 Session 共用。
4. 保持现有安全边界：密钥只进 Windows 凭据管理器，前端只写不读。

### 1.2 非目标（v1 明确不做）

- 并行多 provider（同一时刻 OpenAI 与 DeepSeek 会话同时可用）。这需要按 provider 启动第二个 app-server 并重构前端单连接假设，属于独立架构改动。
- 自定义厂商的完整模型目录编辑器，v1 只内置已知厂商的目录。
- 渠道级代理、超时、重试、负载均衡与自动故障转移。v1 是人工选择渠道，不是自动路由。

## 2 现状评估

### 2.1 当前实现

- `ModelSettings` 是单份配置：`baseUrl`、`modelId`、`reasoningEffort`、`reasoningSummary`、`verbosity`、`serviceTier`，存于 `%APPDATA%\com.codexshell.desktop\settings.json`（`src-tauri/src/config/mod.rs:10`）。
- 密钥只有一条固定凭据 `primary-openai-api-key`，服务名 `com.codexshell.desktop`（`src-tauri/src/credentials/mod.rs:2`）。
- 启动参数固定：provider id `codex_shell_gateway`、`wire_api="responses"`、`env_key="OPENAI_API_KEY"`，通过 `-c` 注入（`src-tauri/src/app_server/mod.rs:156`）。
- 整个应用只有一个 app-server 进程（`AppServerState` 单实例），provider 是进程级属性。
- `model/list` 由 Core 返回内置 GPT 目录；设置中目前没有模型或厂商相关分区，渠道概念不存在。

### 2.2 已实测结论（2026-09-10，Runtime `codex-cli 0.153.4`）

以下结论均由本机真实 app-server 探针得出，不是推测：

1. **`wire_api = "chat"` 已被移除。** 传入时报错 `` `wire_api = "chat"` is no longer supported ``，合法值只剩 `responses`。因此任何 provider 都必须讲 Responses API。
2. **DeepSeek 官方原生支持 Responses API**，base_url 为 `https://api.deepseek.com`，官方提供 Integrate with Codex 文档。
3. **`model_catalog_json` 可用且是替换语义。** 传入自定义目录后，`model/list` 只返回目录内模型（实测返回 `deepseek-flash`、`deepseek-v4-pro`）；不传时，即使 provider 已指向 DeepSeek，`model/list` 仍返回内置 GPT 目录（`gpt-6-astra`、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-5.5`、`gpt-5.2`）。这解释了「只支持几个 GPT 模型」的真实原因。
4. **`env_key` 注入可用**，无需采用 DeepSeek 文档中的 `experimental_bearer_token` 明文写法。
5. `deepseek-flash` 支持图片输入与 `low/high/max` 推理档位，`serviceTiers` 为空；`deepseek-v4-pro` 不支持图片。
6. DeepSeek 官方文档要求该 provider 设置 `web_search = "disabled"`。
7. **按渠道生成的启动参数已端到端验证（2026-09-10）**：使用与 `app_server_arguments` 相同的 `-c` 组合启动 Runtime，注入 CODEX_HOME 内的 DeepSeek 目录后 `model/list` 只返回 `deepseek-flash`、`deepseek-v4-pro`；同一路由去掉 `model_catalog_json` 则恢复内置 GPT 目录；OpenAI 渠道不注入目录同样返回内置目录。
8. **`GET {base}/models` 可作为连接探针（2026-09-10）**：`https://api.deepseek.com/models` 与 `.../v1/models` 在无效 Key 下均返回 401，说明端点存在，且能把鉴权失败与路由错误区分开。

### 2.3 与需求的结构性差距

| 现状 | 目标 |
| --- | --- |
| 单份 provider 配置 | 厂商到渠道列表，全局激活一项 |
| 单条固定密钥 | 每渠道一条密钥，可增删改 |
| 无模型目录概念 | 渠道绑定模型目录 |
| 高级设置直接编辑 Base URL 与 Key | 高级设置只选渠道，渠道在设置中维护 |
| 无迁移与校验 | schema 版本化加参数校准 |

### 2.4 对原始需求的调整建议

原始提法是「设置里分两个栏目：OpenAI、DeepSeek」。建议改成**厂商分组加渠道列表**的单一视图，理由：

- 硬编码两个栏目在加入第三个厂商时必然返工；分组列表天然可扩展。
- 「多渠道」的真实场景多数是同一厂商多条路由（官方直连、中转站、备用 Key）。按厂商分组才能表达这种结构，并列两栏会把同厂商渠道拆散。
- 同一厂商的不同渠道模型集合可能不同，中转站常裁剪模型。因此模型目录必须挂在渠道上，不能只由厂商决定。这是原始需求没有覆盖的第三个必需项。

## 3 领域模型

```text
Vendor（厂商，内置枚举）
  └─ Channel（渠道，用户可增删改）
        ├─ id            稳定标识，创建后不可变，用作密钥键
        ├─ name          用户可见名称
        ├─ baseUrl       路由
        ├─ defaultModelId
        └─ catalog       模型目录来源
ActiveChannelId（全局单例，指向某个 Channel）
```

### 3.1 Vendor

v1 内置两个：

| id | 显示名 | 默认 Base URL | 模型目录 | 协议适配 |
| --- | --- | --- | --- | --- |
| `openai` | OpenAI | `https://api.openai.com/v1` | 内置目录，不写 `model_catalog_json` | `wire_api=responses`，web search 保持 Core 默认 |
| `deepseek` | DeepSeek | `https://api.deepseek.com` | 捆绑目录文件 | `wire_api=responses`，`web_search=disabled` |

Vendor 是代码内常量表，不是用户数据；新增厂商等于改代码加目录文件。厂商属性只描述协议差异，不描述用户选择。

### 3.2 Channel

- `id`：由 CS 生成（`<vendor>-<8 位随机>`），不允许用户编辑，保证改名字不会遗失密钥。
- `name`：用户标签，必填。
- `baseUrl`：必填，规范化为绝对 URL，禁止空值与纯空白。
- `conversation`：该渠道自己的对话参数（`modelId`、推理强度、推理摘要、回答冗余度、服务层级）；缺省模型时取该渠道目录的默认模型。
- `catalog`：见 3.3。
- 渠道不保存密钥，只保存 `id` 作为密钥索引。

### 3.3 模型目录来源

```jsonc
// 继承厂商默认目录
{ "kind": "vendorDefault" }
// 指向一个外部目录文件（v1 保留数据能力，不开放 UI）
{ "kind": "file", "path": "C:/.../models.json" }
```

v1 的 UI 只产生 `vendorDefault`。`file` 保留给后续自定义厂商，避免将来再改 schema。

## 4 存储设计

### 4.1 settings.json v2

```jsonc
{
  "schemaVersion": 2,
  "activeChannelId": "deepseek-3f9a1c02",
  "channels": [
    {
      "id": "deepseek-3f9a1c02",
      "vendor": "deepseek",
      "name": "DeepSeek 官方",
      "baseUrl": "https://api.deepseek.com",
      "catalog": { "kind": "vendorDefault" },
      "conversation": {
        "modelId": "deepseek-flash",
        "reasoningEffort": null,
        "reasoningSummary": null,
        "verbosity": null,
        "serviceTier": "default"
      }
    }
  ]
}
```

- **对话参数挂在渠道上，不是全局一份。** 这是相对初稿的修正：初稿把 `conversation` 放在顶层，切换渠道后再切回来会丢失上一个渠道调好的参数。渠道之间共用同一份会让「OpenAI 的推理档位」被「DeepSeek 的档位」覆盖，与验收标准冲突。
- `conversation` 承载与 provider 无关的对话参数，语义不变，`null` 表示不覆盖 Core 与模型目录；`modelId` 为空表示使用该渠道目录的默认模型。
- 顶层不再出现 `baseUrl`、`modelId`，消除「一份配置既是 provider 又是对话参数」的混淆。
- 读取时若 `schemaVersion` 缺失或为 1，执行第 7 节迁移。

### 4.2 密钥

沿用 `mcp_credentials.rs` 已验证的形态：单条 keyring 记录内放 JSON 映射。

- 服务名：`com.codexshell.desktop`
- 账号名：`provider-channel-credentials`
- 值：`{"<channelId>": "<secret>"}`

理由：避免每条渠道一个系统凭据条目，也避免渠道数量泄漏到凭据管理器条目名与子进程环境。删除最后一条渠道密钥时删除整条记录。

`channelId` 必须通过 `^[a-z0-9][a-z0-9-]{0,63}$` 校验，与 `mcp_credentials::environment_name` 同样的防御思路，防止键名污染。

前端只保留 `save_channel_secret(channelId, secret | null)` 写入接口，不新增回读接口。渠道列表渲染不得依赖密钥是否可读，只显示已保存或未保存。

### 4.3 模型目录文件

- DeepSeek 目录作为 Tauri 捆绑资源随应用分发（`assets/catalogs/deepseek-models.json`，内容取自 DeepSeek 官方 `models.json`）。
- 启动时由 Rust 把内置目录物化到 `<CODEX_HOME>/codex-shell/<vendor>-models.json`，再把该绝对路径写入 `model_catalog_json`；OpenAI 厂商省略该参数。
- 初稿的待验证项（`model_catalog_json` 指向 CODEX_HOME 之外的路径是否被接受）在实现中直接规避：目录始终落在 CODEX_HOME 内，因此不依赖外部路径行为，也不需要额外的资源路径解析。

**取舍**：DeepSeek 官方目录约 76 KB，其中包含其调优过的 Codex `instructions_template`。v1 采用原样内置，理由是能以最小成本获得正确的工具调用、图片输入与推理档位行为。代价是引入第三方文本内容并需要跟随官方更新。备选方案是只写最小元数据、依赖 Core 默认提示词，留待实测对比后再决定。

## 5 运行时装配与切换语义

### 5.1 启动参数

按激活渠道生成，改动集中在 `app_server_arguments`：

- `model_provider`：固定 provider id，v1 仍可用 `codex_shell_gateway`，因为同一时刻只有一个激活渠道。
- `model`：激活渠道的 `defaultModelId`。
- `model_providers.<id>.base_url`：渠道 `baseUrl`。
- `model_providers.<id>.wire_api`：固定 `responses`，唯一合法值。
- `model_providers.<id>.env_key`：固定 `OPENAI_API_KEY`。
- `model_catalog_json`：仅当渠道目录不是内置时注入，指向解析后的绝对路径。
- `web_search`：按厂商适配，DeepSeek 为 `disabled`，OpenAI 不注入。
- 对话参数 `model_reasoning_effort`、`model_reasoning_summary`、`model_verbosity`、`service_tier` 沿用现有逻辑。

不采用每渠道一个环境变量名的做法，避免渠道数量泄漏到子进程环境。

### 5.2 参数校准

切换渠道会换掉整个模型目录，因此必须重新校验，否则请求会带着旧渠道不存在的模型或档位发出去：

- `defaultModelId` 不在新目录时回退到目录首个模型。
- `reasoningEffort` 不在该模型 `supportedReasoningEfforts` 时回退到模型的 `defaultReasoningEffort`。
- `serviceTier` 不在该模型 `serviceTiers` 时回退 `default`，现有逻辑已覆盖单模型场景，需扩展到渠道切换路径。
- `reasoningSummary` 与 `verbosity` 在目录不声明支持时保持不覆盖，不做静默强制。
- 正在显示的 Thread 由 Core 权威设置回流覆盖，不保留旧渠道的模型 ID。

### 5.3 切换时机

- 有 Turn 正在执行时不允许切换，UI 明确提示先中断或等待完成。理由：切换必然重启 app-server，会中断执行中的任务并可能留下半完成状态。
- 空闲时切换：保存、重启 app-server、重新 `initialize`、刷新 `model/list`。
- 切换不删除或修改历史 Session；历史 Session 继续按新渠道执行。

## 6 UI 设计

### 6.1 设置新增「模型渠道」分区

`PreferencesPanel` 的 `PreferencesSection` 增加 `providers`，导航项使用 `lucide-react` 图标，与现有四项保持 16px 与 1.75px stroke 几何。

内容结构：

- 顶部：当前激活渠道摘要，含厂商、渠道名、Base URL 主机名与模型数。
- 厂商分组列表：每个厂商一个分组标题，下面是该厂商的渠道行，显示渠道名、Base URL 主机名、默认模型、密钥状态与激活标记。
- 行操作：编辑、删除。删除按钮默认中性，hover 与确认时使用 danger 语义；删除激活渠道前必须二次确认，并说明会影响新对话。
- 新增渠道：选择厂商，填写名称、Base URL 与 API Key，Key 使用密码输入并在提交后清空，不回读。
- 「测试连接」按钮（v1 已纳入）：对当前编辑中的渠道发起 `GET {baseUrl}/models`，只用 `Authorization: Bearer` 携带密钥，报告路由可达性、密钥是否被接受和目录模型数；不发送推理请求，不产生用量，也不回传密钥。密钥优先取输入框中尚未保存的值，留空时回退到已保存密钥。

### 6.2 对话高级设置

`ModelSettingsPanel` 从「编辑 Base URL 与 Key」改为：

- 顶部渠道选择器，只列出已配置渠道，并提供「前往设置管理渠道」入口。
- 保留推理摘要、回答冗余度、服务层级与 Provider 能力展示。
- 删除 Base URL 与 API Key 输入框；`modelId` 改为「该渠道目录之外的自定义模型 ID（可选）」。
- 渠道未配置时显示空态，引导到设置，而不是展示一个不可用的表单。

### 6.3 复用与约束

- 复用既有类与 Token：`modal-backdrop`、`preferences-modal`、`preferences-nav`、`preferences-section`、`preferences-runtime-card`、`settings-modal`、`segmented`、`field`、`form-status`；颜色、字号、间距与圆角一律消费 `src/styles/tokens.css`。
- 不新增第二套全局视觉模式。厂商分组标题与渠道行如果成为可复用模式，必须先在 `DESIGN.md` 增补说明再实现。
- 键盘与无障碍：分区导航可 Tab 到达，Escape 关闭，删除确认可用 Escape 取消并归还焦点；需要在 `1440x900`、`1280x780`、`1024x720`、`900x700` 四档验证布局。

## 7 迁移方案

1. 读取旧 `settings.json`：无 `schemaVersion` 且含 `baseUrl` 时视为 v1。
2. 生成一个渠道：`vendor` 按 Base URL 主机名推断，`api.deepseek.com` 为 `deepseek`，其余为 `openai`；`name` 为「默认渠道」，`baseUrl` 取原值，`defaultModelId` 取原 `modelId`，`catalog` 为 `vendorDefault`。
3. 把旧 `primary-openai-api-key` 凭据迁移为 `{ "<newChannelId>": "<secret>" }`，成功后删除旧条目；读取失败即无条目时跳过，不阻断启动。
4. 原对话参数搬入 `conversation` 段。
5. 写入 v2 并保留一份 `settings.v1.bak.json` 作为回退依据；迁移失败时不写任何文件，以原行为启动。
6. 迁移只执行一次，`schemaVersion` 为 2 时不再触碰。

## 8 风险与未决问题

- **切换中断成本**：切换渠道必须重启 app-server，正在执行的任务会中断。用户容易低估这一点，UI 必须显式表达。
- **目录归属**：`model_catalog_json` 指向 CODEX_HOME 之外的路径仍未实测；实现选择把目录物化到 CODEX_HOME 内，见 4.3。
- **第三方目录维护**：内置 DeepSeek 目录会随官方更新而漂移，需要记录来源与获取日期，并纳入 ADR-003 的兼容门禁思路。
- **中转站密钥风险**：渠道模式鼓励用户配置第三方中转，密钥会被交给第三方。UI 应有一句事实性提示，但不做过度警告。
- **DeepSeek 模型生命周期**：`deepseek-v4-pro` 自 2026-09-14 起被路由到 V4.1 Flash 并计划下线，不应作为默认模型内置。
- **容量与一致性**：密钥集中在单条 keyring 记录，受系统凭据容量限制，写入需要与 `WRITE_LOCK` 同类的串行化。
- **回读边界不可破**：渠道列表、日志与状态文档都不得包含密钥或密钥片段。

## 9 实施步骤（已执行）

以下步骤已在 2026-09-10 全部执行；完成证据、当前接口和残留风险见 [模型配置状态](../docs/status/model-config-status.md) 等模块状态文档，本文不再维护完成状态。

1. 验证 `model_catalog_json` 外部路径行为，确定目录落盘位置。
2. Rust：`config` 引入 v2 schema 与迁移；`credentials` 增加渠道密钥映射；`app_server` 按激活渠道生成参数并注入目录。
3. Rust 单测：迁移正确性、渠道校验、参数生成、密钥映射增删。
4. 前端：`PreferencesPanel` 新增「模型渠道」分区与渠道增删改；`ModelSettingsPanel` 改为渠道选择；`useAppController` 接通激活渠道与重启路径。
5. 落地参数校准与「运行中禁止切换」策略。
6. Vitest：渠道增删改、空态、切换校准、密钥不回读。
7. 真实 app-server 探针：按渠道启动并确认 `model/list` 返回对应目录。
8. 文档：新增 ADR（厂商与渠道抽象及数据归属），更新 `model-config-status.md`、`credentials-status.md`、`runtime-status.md`、`PROJECT_STATUS.md`，必要时增补 `DESIGN.md`。

## 10 验收标准

- 设置中可新增、编辑、删除渠道；重启应用后配置与密钥仍生效，且密钥无法在前端回读。
- 激活 DeepSeek 渠道后模型菜单只出现 DeepSeek 模型；切回 OpenAI 渠道后恢复内置目录。
- 切换渠道后不出现模型不存在或档位不支持的失败请求。
- 有任务在执行时无法切换渠道，并有明确提示。
- 旧版本配置升级到 v2 后行为等价，密钥不丢失。
- `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm rust:check` 通过。