# 项目总状态

- 当前阶段：Milestone 2 - P0 桌面编程工作台；公开稳定版本 `v0.1.4` 已启用 Tauri Updater
- 总体状态：核心对话、Session、工具活动、审批、文件、Diff 和模型配置可用；已发布带 minisign 更新签名的 NSIS Windows 安装包，Windows Authenticode 代码签名、CI 与 Runtime 恢复能力尚未完成。
- 文档边界：本文件只记录跨模块当前快照、项目级风险、下一里程碑和完整验证基线。模块行为和定向证据以 [模块状态索引](../README.md#当前状态) 为准，历史由 Git 保留。
- 最后更新：2026-09-10

## 跨模块当前快照

- 产品使用 Tauri 2、React、TypeScript 与 Rust 构建，以原版 `codex app-server` 为唯一执行核心，通过 stdio JSON-RPC 通信；公开 `v0.1.4` 已发布安装器、minisign 签名和 updater manifest。当前 Runtime 为通过兼容门禁的 `codex-cli 0.153.4`，生成协议类型仍以 `0.152.1` 为基线。参见 [ADR-001](../decisions/ADR-001-unmodified-codex-app-server.md) 与 [ADR-003](../decisions/ADR-003-compatible-runtime-updates.md)。
- 核心工作流已形成闭环：用户可以选择项目、创建和恢复多个 Session、发送文本/文件/图片、查看结构化执行时间线、处理审批、审查实时与历史 Diff，并按完成 Turn 分叉会话。
- Composer 已统一模型、推理强度、权限、Goal、Plan、Review、Skills、MCP 和压缩入口；Thread 的模型、权限、审批者和 Goal 状态以 Core 权威通知及查询结果为准，不在 Shell 维护第二套执行状态。
- 模型配置已改为「厂商分组 + 渠道列表」（[ADR-004](../decisions/ADR-004-model-provider-channels.md)）：设置中维护 OpenAI / DeepSeek 渠道的 Base URL、密钥、模型目录和该渠道自己的对话参数，对话高级设置只选择渠道；同一时刻只有一个激活渠道，切换渠道会重启 app-server，全部运行 Thread、主会话和侧聊提交期间禁止切换。DeepSeek 渠道注入随应用编译的官方模型目录，连接测试只验证路由、密钥与目录。
- Windows 桌面界面正在逐步收敛到 `DESIGN.md` 和语义 Token；三栏布局在窄窗口下保留功能入口，设置承载个性化、外观、模型渠道、运行环境和诊断，右栏提供项目文件浏览和独立只读侧边聊天。
- Codex Shell 的配置、凭据、Session、SQLite、Skills、日志和缓存与官方 Codex 隔离；API Key 只保存在 Windows Credential Manager。默认项目按日期创建于系统文档目录。参见 [ADR-002](../decisions/ADR-002-isolated-runtime-data.md)。
- 选择项目后，右侧 inspector 的“项目文件”入口复用 app-server 文件读取与 watch 能力打开右侧 WorkspaceExplorer 抽屉；“侧边聊天”入口复用同一 app-server 连接，以 `ephemeral` fork 和独立事件 reducer 提供旁聊；目录根始终来自待创建 Thread 的项目路径或当前 Thread 的服务端 `cwd`。文件变更仍在会话时间线内查看。
- 前端状态、日志、通知、资源预览、过程事件和可见 Turn 均有硬上限；时间线使用单一原生滚动容器，并只保留最近 200 个 Turn 的前端视图状态。
- 当前 Session 的 UI 错误使用可关闭、5 秒自动消失的临时提示；切换 Session 时清理旧提示。服务端 `session.error` 仍作为持久错误保留，避免关键执行失败被自动隐藏。

## 项目级风险

- 多渠道审查缺陷已修复并补回归；真实系统凭据与 API 对话尚需人工验收。配置与凭据只能提供失败补偿，不能承诺跨存储崩溃原子性，详见 [模型配置](model-config-status.md) 和 [凭据安全](credentials-status.md)。

- app-server 自动断线恢复尚未完成；代际隔离可以阻止旧进程事件污染新连接，但不会主动重启崩溃进程或恢复进行中的 Turn。
- Runtime 二进制不进入 Git；个人发布通过本机脚本暂存同源 Runtime、运行兼容门禁并生成安装器、minisign 签名和 updater manifest，再手动上传 Release。`v0.1.4` 已完成该发布流程及干净 Windows 环境的 UAC、sandbox readiness 和 elevated 命令验证；Windows Authenticode 代码签名仍未完成。MSI 不是默认发布目标。
- 模型路由同一时刻只能有一个 provider：并行多厂商会话需要按 provider 启动第二个 app-server 并重构前端单连接假设，尚未排期。内置的第三方模型目录需要跟随上游维护。
- 渠道切换依赖重启共享 app-server；运行或提交中拒绝切换，切换事务期间拒绝新的执行 RPC。失败时保留已保存配置并提供重试，不实现自动故障转移或并行 Provider。
- Skills 独立安装/启停/可恢复卸载、MCP 用户配置与安全 Token 输入、本地 Marketplace/Plugin 管理页面已接入；扩展变化刷新状态，不自动中断任务。
- 文件预览仍会先经 IPC 读取完整文件；超大 Diff、单个超长活动和二进制 Diff 缺少源端预算或专用视图。
- 侧边聊天当前固定只读沙箱、`approvalPolicy: never`，不会替代主会话执行写入或审批流程；侧聊状态暂不持久化，也不会出现在历史列表；关闭时在连接可用的情况下先中断活动 Turn，再退订临时 Thread，Runtime 已停止时不触发重连；切换主 Session 或 Runtime 重置后返回右侧功能入口。

模块局部风险不在此重复，见 [各模块状态文档](../README.md#当前状态)。

## 下一里程碑

1. 人工验收真实第三方 MCP OAuth、Git Marketplace 下载与系统凭据写入。
2. 维持 API Key 个人使用边界，不引入官方远程目录、OpenAI 账户或 Connector 登录。
3. 实现 app-server 断线后当前 Session 的可控恢复，并明确进行中 Turn 的失败、重试和状态回收边界。
4. 建立 CI 与 Windows Authenticode 代码签名基线，并持续在干净 Windows 用户环境回归 elevated Sandbox 与 sidecar。

## 完整验证基线

- 2026-09-10 渠道修复：TypeScript、ESLint、Knip、Vitest（63 个文件 / 313 项）、production build、Cargo check、36 项 Rust 单测、严格 Clippy、Debug 构建与四视口渠道布局检查通过；本次未使用真实 API Key 或真实系统凭据做端到端切换。覆盖范围和限制见 [测试与发布](testing-release-status.md)。下条 Runtime 探针是既有证据，本次未重跑。

- 2026-09-10：模型配置改为厂商分组 + 渠道列表，并把对话参数按渠道归属；DeepSeek 渠道接入内置官方模型目录。`pnpm typecheck`、`pnpm lint`、`pnpm test`（62 个文件 / 301 项）、`pnpm quality:knip`、`pnpm build` 和 `pnpm rust:check`（Cargo check、31 项 Rust 单测、严格 Clippy）全部通过；真实 app-server 探针确认按渠道注入 `model_catalog_json` 后 `model/list` 返回对应目录，同路由不注入则返回内置 GPT 目录；端点探针确认 `https://api.deepseek.com/models` 在无效 Key 下返回 401。未使用真实 DeepSeek 密钥完成对话，模型中转渠道设置与对话高级设置已通过 `pnpm test:channel-layout`（Playwright + 本机 Chrome，模拟回调）：1440×900、1280×780、1024×720、900×700 四档均无页面级横向溢出，模态框不越界，可见文字不小于 11px，键盘焦点可进入面板，删除二次确认、Escape 关闭和 reduced-motion 均生效；该脚本挂载真实组件但使用模拟回调，不是真实 Tauri 端到端。
- 2026-09-07：公开 `v0.1.4` Release 已上传 `codex-shell_0.1.4_x64-setup.exe`、对应 minisign `.sig` 和 `latest.json`；发布 tag 记录兼容门禁 Runtime `codex-cli 0.153.4`，并完成干净 Windows 用户环境的 UAC、sandbox readiness 和 elevated 命令验证。
