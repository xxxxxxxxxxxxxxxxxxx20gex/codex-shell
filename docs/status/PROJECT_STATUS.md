# 项目总状态

- 当前阶段：Milestone 2 - P0 桌面编程工作台
- 总体状态：核心对话、Session、工具活动、审批、文件、Diff 和模型配置可用；已具备可复验的 NSIS Windows 安装包发布链路，签名、CI 与 Runtime 恢复能力尚未完成。
- 文档边界：本文件只记录跨模块当前快照、项目级风险、下一里程碑和完整验证基线。模块行为和定向证据以 [模块状态索引](../README.md#当前状态) 为准，历史由 Git 保留。
- 最后更新：2026-08-24

## 跨模块当前快照

- 产品使用 Tauri 2、React、TypeScript 与 Rust 构建，以固定版本的原版 `codex app-server` 为唯一执行核心，通过 stdio JSON-RPC 通信；Runtime、companion binaries 和生成协议类型保持同版基线。参见 [ADR-001](../decisions/ADR-001-unmodified-codex-app-server.md)。
- 核心工作流已形成闭环：用户可以选择项目、创建和恢复多个 Session、发送文本/文件/图片、查看结构化执行时间线、处理审批、审查实时与历史 Diff，并按完成 Turn 分叉会话。
- Composer 已统一模型、推理强度、权限、Goal、Plan、Review、Skills、MCP 和压缩入口；Thread 的模型、权限、审批者和 Goal 状态以 Core 权威通知及查询结果为准，不在 Shell 维护第二套执行状态。
- Windows 桌面界面已收敛到 `DESIGN.md` 和语义 Token；三栏布局在窄窗口下保留功能入口，设置承载个性化、外观、运行环境和诊断，右栏专注文件变更审查。
- Codex Shell 的配置、凭据、Session、SQLite、Skills、日志和缓存与官方 Codex 隔离；API Key 只保存在 Windows Credential Manager。默认项目按日期创建于系统文档目录。参见 [ADR-002](../decisions/ADR-002-isolated-runtime-data.md)。
- 选择项目后，左侧“项目文件”入口复用 app-server 文件读取与 watch 能力打开 WorkspaceExplorer；目录根始终来自待创建 Thread 的项目路径或当前 Thread 的服务端 `cwd`。
- 前端状态、日志、通知、资源预览、过程事件和可见 Turn 均有硬上限；时间线使用单一原生滚动容器，并只保留最近 200 个 Turn 的前端视图状态。
- 当前 Session 的 UI 错误使用可关闭、5 秒自动消失的临时提示；切换 Session 时清理旧提示。服务端 `session.error` 仍作为持久错误保留，避免关键执行失败被自动隐藏。

## 项目级风险

- app-server 自动断线恢复尚未完成；代际隔离可以阻止旧进程事件污染新连接，但不会主动重启崩溃进程或恢复进行中的 Turn。
- Runtime 二进制尚无可复现的获取或构建流水线；安装包已可由本机固定 Runtime 生成 NSIS，但签名、CI、干净 Windows 环境的 UAC 和 sidecar 验证仍未完成。MSI 不是默认发布目标。
- Shell Queue 只存在当前进程内，应用退出后不会恢复；MCP 配置编辑、Skills/Plugin 管理和显式连接诊断尚未完成。
- 文件预览仍会先经 IPC 读取完整文件；超大 Diff、单个超长活动和二进制 Diff 缺少源端预算或专用视图。

模块局部风险不在此重复，见 [各模块状态文档](../README.md#当前状态)。

## 下一里程碑

1. 实现 app-server 断线后当前 Session 的可控恢复，并明确进行中 Turn 的失败、重试和状态回收边界。
2. 继续拆分高频 Composer 与 Session 编排入口，保持行为和测试基线不变。
3. 建立 CI、固定 Runtime 获取与校验、安装包签名基线，并在干净 Windows 用户环境验证 elevated Sandbox 与 sidecar。
4. 在 Runtime 或读取协议层增加大文件、Diff 和活动输出预算，避免只依赖前端截断。

## 完整验证基线

- 2026-08-21：固定 Runtime `0.148.0-alpha.15` 的 Thread 权威 settings/Goal 同步、审查状态单调更新及原生滚动条释放与可信 scroll 兜底完成；时间线移除 react-virtuoso，改用单一原生滚动容器、程序定位隔离、用户滚动 settle 锁、运行中受控贴底和 Session 切换重置；新增 Session 临时提示关闭/自动消失。
- 2026-08-24：选择项目后的左侧“项目文件”入口接入现有 WorkspaceExplorer；TypeScript、ESLint、56 个 Vitest 文件/247 项测试、Vite production build 和 Tauri debug build 通过。
- 定向滚动与临时提示测试通过；完整前端回归为 56 个文件/247 项测试，TypeScript、ESLint、Vite production build、Rust check 和 14 项 Rust 测试通过。当前构建约 555.91 kB，仍有 Vite bundle size warning。
- Knip 因当前 Windows/Node Oxc parser 的 ArrayBuffer 分配错误短路，未产生无效代码报告；该结果不能作为无效代码检查通过的证据。
- 2026-08-21：`pnpm desktop:package` 在低并发 release 配置下成功生成 NSIS 安装包；隔离临时目录静默安装检查主程序、4 个 Runtime/companion 文件和 LICENSE/NOTICE 资源存在，随后静默卸载成功。安装包未签名，正式公开分发前需完成签名和干净 Windows 验收。
- 真实网关探针确认 low 至 ultra、三档 verbosity、四种 summary 和 Priority 参数正确进入 `/v1/responses`。真实 app-server smoke 已覆盖多 Turn 恢复、并行 Thread、文件 RPC、Skills/MCP/Goal、Plan 和本机工具；这些证据只对应固定 Runtime，不代表 Codex 最新开发分支。
- 静态审查未发现 PAT、API Key、用户密钥或开发机绝对路径。
