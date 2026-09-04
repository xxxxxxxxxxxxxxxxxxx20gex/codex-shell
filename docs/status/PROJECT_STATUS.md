# 项目总状态

- 当前阶段：Milestone 2 - P0 桌面编程工作台；公开稳定版本 `v0.1.2`
- 总体状态：核心对话、Session、工具活动、审批、文件、Diff 和模型配置可用；已具备可复验的 NSIS Windows 安装包发布链路，签名、CI 与 Runtime 恢复能力尚未完成。
- 文档边界：本文件只记录跨模块当前快照、项目级风险、下一里程碑和完整验证基线。模块行为和定向证据以 [模块状态索引](../README.md#当前状态) 为准，历史由 Git 保留。
- 最后更新：2026-09-04

## 跨模块当前快照

- 产品使用 Tauri 2、React、TypeScript 与 Rust 构建，以原版 `codex app-server` 为唯一执行核心，通过 stdio JSON-RPC 通信；`v0.1.2` 发布包暂存的是通过兼容门禁的 `codex-cli 0.153.0-alpha.5`，发布 manifest 记录实际版本、哈希和 companion binaries。生成协议类型仍以 `0.152.1` 为基线。参见 [ADR-001](../decisions/ADR-001-unmodified-codex-app-server.md) 与 [ADR-003](../decisions/ADR-003-compatible-runtime-updates.md)。
- 核心工作流已形成闭环：用户可以选择项目、创建和恢复多个 Session、发送文本/文件/图片、查看结构化执行时间线、处理审批、审查实时与历史 Diff，并按完成 Turn 分叉会话。
- Composer 已统一模型、推理强度、权限、Goal、Plan、Review、Skills、MCP 和压缩入口；Thread 的模型、权限、审批者和 Goal 状态以 Core 权威通知及查询结果为准，不在 Shell 维护第二套执行状态。
- Windows 桌面界面已收敛到 `DESIGN.md` 和语义 Token；三栏布局在窄窗口下保留功能入口，设置承载个性化、外观、运行环境和诊断，右栏提供项目文件浏览和独立只读侧边聊天。
- Codex Shell 的配置、凭据、Session、SQLite、Skills、日志和缓存与官方 Codex 隔离；API Key 只保存在 Windows Credential Manager。默认项目按日期创建于系统文档目录。参见 [ADR-002](../decisions/ADR-002-isolated-runtime-data.md)。
- 选择项目后，右侧 inspector 的“项目文件”入口复用 app-server 文件读取与 watch 能力打开右侧 WorkspaceExplorer 抽屉；“侧边聊天”入口复用同一 app-server 连接，以 `ephemeral` fork 和独立事件 reducer 提供旁聊；目录根始终来自待创建 Thread 的项目路径或当前 Thread 的服务端 `cwd`。文件变更仍在会话时间线内查看。
- 前端状态、日志、通知、资源预览、过程事件和可见 Turn 均有硬上限；时间线使用单一原生滚动容器，并只保留最近 200 个 Turn 的前端视图状态。
- 当前 Session 的 UI 错误使用可关闭、5 秒自动消失的临时提示；切换 Session 时清理旧提示。服务端 `session.error` 仍作为持久错误保留，避免关键执行失败被自动隐藏。

## 项目级风险

- app-server 自动断线恢复尚未完成；代际隔离可以阻止旧进程事件污染新连接，但不会主动重启崩溃进程或恢复进行中的 Turn。
- Runtime 二进制尚无可复现的获取或构建流水线；安装包已可由本机通过兼容门禁的 Runtime 生成 NSIS，但签名、CI、干净 Windows 环境的 UAC 和 sidecar 验证仍未完成。MSI 不是默认发布目标。
- Shell Queue 只存在当前进程内，应用退出后不会恢复；MCP 配置编辑、Skills/Plugin 管理和显式连接诊断尚未完成。
- 文件预览仍会先经 IPC 读取完整文件；超大 Diff、单个超长活动和二进制 Diff 缺少源端预算或专用视图。
- 侧边聊天当前固定只读沙箱、`approvalPolicy: never`，不会替代主会话执行写入或审批流程；侧聊状态暂不持久化，也不会出现在历史列表；关闭时在连接可用的情况下先中断活动 Turn，再退订临时 Thread，Runtime 已停止时不触发重连；切换主 Session 或 Runtime 重置后返回右侧功能入口。

模块局部风险不在此重复，见 [各模块状态文档](../README.md#当前状态)。

## 下一里程碑

1. 实现 app-server 断线后当前 Session 的可控恢复，并明确进行中 Turn 的失败、重试和状态回收边界。
2. 继续拆分高频 Composer 与 Session 编排入口，保持行为和测试基线不变。
3. 建立 CI、Runtime 获取与兼容校验、安装包签名基线，并在干净 Windows 用户环境验证 elevated Sandbox 与 sidecar。
4. 在 Runtime 或读取协议层增加大文件、Diff 和活动输出预算，避免只依赖前端截断。

## 完整验证基线

- 2026-09-02：代码健康审查移除未被消费的 `tools.update_plan.enabled` 诊断读取、`config/read` 客户端包装和 `sendOrQueue` 的重复图片分支；保留生成协议类型及历史/旧 Runtime 兼容逻辑。`pnpm lint`、`pnpm typecheck`、57 个 Vitest 文件/261 个测试、Vite production build、Rust check、14 个 Rust 单测和 Clippy 通过。Knip 在 OXC 解析阶段因本机 ArrayBuffer 分配失败退出，未产生诊断；该结果不作为无效代码通过证据。

- 2026-09-04：修复首次启动在持久化网关配置读取完成前提前启动 app-server，以及保存网关配置时用旧 React 状态重启的问题；历史加载受配置就绪闸门控制，设置重启在新状态提交后执行。新增回归测试；前端完整回归为 57 个文件/262 个测试，TypeScript、ESLint、Vite production build、Rust check、14 个 Rust 单测和 Clippy 通过。

- 2026-08-21：固定 Runtime `0.148.0-alpha.15` 的 Thread 权威 settings/Goal 同步、审查状态单调更新及原生滚动条释放与可信 scroll 兜底完成；时间线移除 react-virtuoso，改用单一原生滚动容器、程序定位隔离、用户滚动 settle 锁、运行中受控贴底和 Session 切换重置；新增 Session 临时提示关闭/自动消失。
- 2026-08-25：项目文件浏览器改为以内嵌方式挂载到右侧 inspector，与侧边聊天共享面板生命周期；标题栏操作统一为无边框图标按钮，最大化/恢复直接控制右侧栏宽度，长项目路径不会再挤出关闭操作区；时间线离开底部后使用三个图标按钮跳转上一条用户消息、下一条用户消息和最新位置；清理未再被 App 引用的旧 DiffInspector 组件、样式和测试。TypeScript、ESLint、57 个 Vitest 文件/256 项测试、Vite production build、Rust check、14 项 Rust 单测、Clippy 和 Tauri debug build 通过；确认默认 target 的拒绝访问来自仍在运行的本项目 app-server，构建脚本现会按路径只回收该项目 target 下的旧进程后再构建；Knip 仍受 Windows/Node Oxc parser 内存分配失败影响。
- 2026-08-26：Runtime staging 改为兼容更新通道，使用本机 `codex-cli 0.149.0-alpha.4.1` 与同目录 companion binaries 重新生成协议；新增协议兼容门禁，确认 CS 现有生成文件、RPC、通知和反向请求未被删除或修改。补齐生成类型变化后的 `projectId`、agent message `delivery` 测试夹具。TypeScript、ESLint、57 个 Vitest 文件/258 项测试、Vite production build、Rust check、14 项 Rust 单测、Clippy 和 Tauri debug build 通过；debug NSIS 安装包重新生成。
- 2026-08-26：正式 `pnpm desktop:package` 通过，生成使用兼容门禁 Runtime 的 release NSIS 安装包（约 89.0 MB）。
- 2026-08-24：右侧 inspector 新增 Codex 风格侧边聊天；通过 `thread/fork`/`thread/start` 创建 `ephemeral` 只读线程，新增主线程与侧聊事件路由隔离、关闭时中断活动 Turn 后退订、`Ctrl/Cmd+Alt+S` 快捷打开和最大化/恢复；fork 的父级历史仅作为模型上下文，不在侧栏重复渲染；Thread 创建完成前不展示详情 Composer，避免首条消息在无 Thread ID 时被静默丢弃；主 Session 切换或 Runtime 重置后返回功能入口；加入事件路由、面板交互、未就绪发送和关闭生命周期测试，前端回归为 58 个 Vitest 文件/255 项测试。
- 定向滚动与临时提示测试通过；完整前端回归为 56 个文件/247 项测试，TypeScript、ESLint、Vite production build、Rust check 和 14 项 Rust 测试通过。当前构建约 555.91 kB，仍有 Vite bundle size warning。
- Knip 因当前 Windows/Node Oxc parser 的 ArrayBuffer 分配错误短路，未产生无效代码报告；该结果不能作为无效代码检查通过的证据。
- 2026-08-21：`pnpm desktop:package` 在低并发 release 配置下成功生成 NSIS 安装包；隔离临时目录静默安装检查主程序、4 个 Runtime/companion 文件和 LICENSE/NOTICE 资源存在，随后静默卸载成功。安装包未签名，正式公开分发前需完成签名和干净 Windows 验收。
- 真实网关探针确认 low 至 ultra、三档 verbosity、四种 summary 和 Priority 参数正确进入 `/v1/responses`。真实 app-server smoke 已覆盖多 Turn 恢复、并行 Thread、文件 RPC、Skills/MCP/Goal、Plan 和本机工具；这些证据对应本次通过兼容门禁的 `0.149.0-alpha.4.1` Runtime，不代表 Codex 最新开发分支。
- 静态审查未发现 PAT、API Key、用户密钥或开发机绝对路径。
