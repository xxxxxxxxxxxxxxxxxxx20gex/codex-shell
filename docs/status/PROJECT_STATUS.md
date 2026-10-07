# 项目总状态

- 当前阶段：Milestone 2 - P0 桌面编程工作台；公开 `v0.1.9` 是内核升级前的发布基线，保持原有 Runtime。main 已升级至 0.160.1，作为尚未另行发布的开发基线。
- 总体状态：核心对话、Session、工具活动、审批、文件、Diff 和模型配置可用；已发布带 minisign 更新签名的 NSIS Windows 安装包，Windows Authenticode 代码签名、CI 与 Runtime 恢复能力尚未完成。
- 文档边界：本文件只记录跨模块当前快照、项目级风险、下一里程碑和完整验证基线。模块行为和定向证据以 [模块状态索引](../README.md#当前状态) 为准，历史由 Git 保留。
- 最后更新：2026-10-07

## 跨模块当前快照

- 图片附件已贯通历史附件、生成/工具图片与项目文件预览，支持坐标批注和本地草图编辑原型；自由画笔与橡皮擦使用合并指针采样逐段绘制平滑曲线，草图导出复用 Tauri 附件保存与原生 `localImage` 输入，托管 `fileId` 图片仍只读。剪贴板图片在 Tauri 边界限制格式和单张大小后保存到独立 CODEX_HOME，再以原生 `localImage` 输入发送。终端空轮询不进入时间线，真实终端输入收纳到折叠过程组。验证边界见时间线、客户端和测试状态。

- 产品使用 Tauri 2、React、TypeScript 与 Rust 构建，以原版 `codex app-server` 为唯一执行核心，通过 stdio JSON-RPC 通信；公开 `v0.1.9` 已发布安装器、minisign 签名和 updater manifest，使用 0.154.0-alpha.6.2。main 的 Runtime 已升级至 `codex-cli 0.160.1`，生成协议比对保持一致，通过同源兼容门禁与隔离升级探针；具体能力和限制见 [协议状态](protocol-status.md)。升级遵循 [ADR-003](../decisions/ADR-003-compatible-runtime-updates.md)，历史迁移使用 [ADR-005](../decisions/ADR-005-native-history-migration.md) 的原生方案。
- 核心工作流已形成闭环：用户可以选择项目、创建和恢复多个 Session、发送文本/文件/图片、查看结构化执行时间线、处理审批、审查实时与历史 Diff，并按完成 Turn 分叉会话。
- Composer 已统一模型、推理强度、权限、Goal、Plan、Review、Skills、MCP 和压缩入口；Thread 的模型、权限、审批者和 Goal 状态以 Core 权威通知及查询结果为准，不在 Shell 维护第二套执行状态。
- 模型配置已改为「厂商分组 + 渠道列表」（[ADR-004](../decisions/ADR-004-model-provider-channels.md)）：设置中维护 OpenAI / DeepSeek 渠道的 Base URL、密钥、模型目录和该渠道自己的对话参数，对话高级设置只选择渠道；同一时刻只有一个激活渠道，切换渠道会重启 app-server，全部运行 Thread、主会话和侧聊提交期间禁止切换。DeepSeek 渠道注入随应用编译的官方模型目录，连接测试只验证路由、密钥与目录。
- Windows 桌面界面正在逐步收敛到 `DESIGN.md` 和语义 Token；三栏布局在窄窗口下保留功能入口，设置承载个性化、外观、模型渠道、运行环境和诊断，右栏提供项目文件浏览和独立只读侧边聊天。
- Codex Shell 的配置、凭据、Session、SQLite、Skills、日志和缓存与官方 Codex 隔离；API Key 只保存在 Windows Credential Manager。默认项目按日期创建于系统文档目录。参见 [ADR-002](../decisions/ADR-002-isolated-runtime-data.md)。
- 选择项目后，右侧 inspector 的“项目文件”入口复用 app-server 文件读取与 watch 能力打开右侧 WorkspaceExplorer 抽屉；“侧边聊天”入口复用同一 app-server 连接，以 `ephemeral` fork 和独立事件 reducer 提供旁聊；目录根始终来自待创建 Thread 的项目路径或当前 Thread 的服务端 `cwd`。文件变更仍在会话时间线内查看。
- 前端状态、日志、通知、资源预览、过程事件和可见 Turn 均有硬上限；时间线使用单一原生滚动容器，并只保留最近 200 个 Turn 的前端视图状态。
- 当前 Session 的 UI 错误使用可关闭、5 秒自动消失的临时提示；切换 Session 时清理旧提示。服务端 `session.error` 仍作为持久错误保留，避免关键执行失败被自动隐藏。
- 最后一条用户消息编辑复用 Composer，原生回退与事件同步合并并隔离迟到响应；回退后刷新失败保留草稿并清除旧编辑目标。队列取消等待 Core 确认，失败保持可见；侧聊和普通分叉已按新版分页契约适配。详见 [项目与线程](workspace-thread-status.md)。

## 项目级风险

- 新内核启动会由 Core 后台迁移 legacy 历史；真实大库、忙文件、损坏数据和完整 WebView2 尚未验收。运行升级版前应备份独立 CODEX_HOME，旧安装包不保证能读取新版历史；本轮未启动真实用户数据目录。

- 多渠道审查缺陷已修复并补回归；真实系统凭据与 API 对话尚需人工验收。配置与凭据只能提供失败补偿，不能承诺跨存储崩溃原子性，详见 [模型配置](model-config-status.md) 和 [凭据安全](credentials-status.md)。

- app-server 自动断线恢复尚未完成；代际隔离可以阻止旧进程事件污染新连接，但不会主动重启崩溃进程或恢复进行中的 Turn。
- Runtime 二进制不进入 Git；个人发布通过本机脚本暂存同源 Runtime、运行兼容门禁并生成安装器、minisign 签名和 updater manifest，再手动上传 Release。v0.1.9 已完成该发布流程；Windows Authenticode 代码签名仍未完成。MSI 不是默认发布目标。
- 模型路由同一时刻只能有一个 provider：并行多厂商会话需要按 provider 启动第二个 app-server 并重构前端单连接假设，尚未排期。内置的第三方模型目录需要跟随上游维护。
- 渠道切换依赖重启共享 app-server；运行或提交中拒绝切换，切换事务期间拒绝新的执行 RPC。失败时保留已保存配置并提供重试，不实现自动故障转移或并行 Provider。
- Skills 独立安装/启停/可恢复卸载、MCP 用户配置与安全 Token 输入、CS 内置目录已接入。CS 不提供插件市场或插件生命周期管理；Core 插件协议仅作为运行时兼容面保留。内置目录与依赖边界见 [扩展能力](agent-capabilities-status.md)；扩展变化刷新状态，不自动中断任务。
- 文件预览仍会先经 IPC 读取完整文件；超大 Diff、单个超长活动和二进制 Diff 缺少源端预算或专用视图。
- 侧边聊天当前固定只读沙箱、`approvalPolicy: never`，不会替代主会话执行写入或审批流程；侧聊状态暂不持久化，也不会出现在历史列表；关闭时在连接可用的情况下先中断活动 Turn，再退订临时 Thread，Runtime 已停止时不触发重连；切换主 Session 或 Runtime 重置后返回右侧功能入口。

模块局部风险不在此重复，见 [各模块状态文档](../README.md#当前状态)。

## 下一里程碑

1. 人工验收真实第三方 MCP OAuth 与系统凭据写入。
2. 维持 API Key 个人使用边界，不引入官方远程目录、OpenAI 账户或 Connector 登录。
3. 实现 app-server 断线后当前 Session 的可控恢复，并明确进行中 Turn 的失败、重试和状态回收边界。
4. 建立 CI 与 Windows Authenticode 代码签名基线，并持续在干净 Windows 用户环境回归 elevated Sandbox 与 sidecar。

## 完整验证基线

- 当前验证、发布资产和未覆盖边界统一见 [测试与发布状态](testing-release-status.md)；历史发布基线由 Git 保留。当前仍不把模拟探针、局部浏览器检查或用户未枚举的手工检查宣称为全量桌面、真实外部 API 或干净机器验收。
- 当前发布基线：发布冻结分支 `release/v0.1.9` 和 Tag `v0.1.9` 应与本次发布提交保持一致；后续功能直接在 `main` 开发，发布时按新的版本号重新建立发布分支和 Tag。
