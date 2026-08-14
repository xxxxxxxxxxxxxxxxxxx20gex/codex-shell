# 项目总状态

- 当前阶段：Milestone 2 - P0 桌面编程工作台
- 总体状态：核心对话、Session、工具活动、审批、文件、Diff 和模型配置可用；发布工程与 Runtime 恢复能力尚未完成。
- 文档原则：本文件只记录跨模块当前基线、风险和下一里程碑；历史变更以 Git 提交和各模块状态文档为准，不在此累积功能流水账。
- 最后更新：2026-08-14

## 当前基线

### 架构与隔离

- 桌面壳使用 Tauri 2、React、TypeScript 和 Rust，不修改 Codex Core；智能体执行只通过原版 `codex app-server` 的 stdio JSON-RPC 完成。
- Runtime 固定为 `codex-cli 0.146.0-alpha.9.2`，稳定 v2 类型由同一 Runtime 生成；Plan 仅使用最小范围的实验字段适配。
- CODEX_HOME 默认位于用户目录下的 `.codex-shell`，配置、凭据、SQLite、Session、缓存和默认项目均与官方 Codex 隔离；源码不包含开发机绝对路径。
- API Key 只保存在 Windows Credential Manager，并通过子进程环境变量注入独立 provider；前端没有读取明文凭据的接口。

### 对话与 Session

- 支持 Thread 创建、只读打开、按需 Resume、分页历史、重命名、固定、归档、恢复、删除、Fork 和 rollout 路径/ID 复制。
- 多个 Session 可并行运行；当前 Session 的普通补充消息进入每 Session 最多 10 条的内存 Queue，显式 `Ctrl/Cmd+Shift+Enter` 使用原生 `turn/steer`。
- 模型、推理强度、沙盒范围和审批者随下一次 `turn/start` 生效，不因参数切换创建新 Session；Queue 会快照入队时的权限和模型设置。
- 前端只保留当前 Session 最近 200 个 Turn，关联 Diff、Plan 和流式状态同步裁剪。

### Composer 与能力入口

- Composer 左侧为统一 `+` 菜单和权限，右侧为模型、推理强度和发送；模型与权限只在悬停或聚焦时显示交互区域。
- `+` 菜单统一提供文件、Skills、MCP、压缩、计划、目标和 Review；键入 `/` 仍支持过滤、方向键选择和 Enter 执行。
- 权限按 app-server 原生沙盒分为只读、工作区写入、完全访问；自动风险审查是独立审批者设置，默认仍为完全访问。
- 模型目录和推理强度来自 `model/list`；网关、API Key、自定义模型和回答冗余度位于高级设置。

### 时间线、文件与诊断

- 时间线按 app-server 原始顺序展示用户/助手消息、推理、计划、命令、文件、MCP、动态工具、搜索、图片和子智能体活动；命令默认折叠，文件修改在回答末尾汇总。
- 运行中显示“正在处理”和实时耗时，完成后冻结服务端或本地生命周期计算出的最终耗时；长 Session 使用可变高度虚拟列表。
- 新 Thread 未选择项目时使用 `Documents/Codex-Shell/YYYY-MM-DD`，自定义项目只在首条消息前可选；已有 Thread 始终使用服务端返回的 `cwd`。
- 支持文件/图片附件、剪贴板图片、拖拽、`@` 文件引用、项目浏览和预览、目录 watch、实时/历史 Diff、上下文 Token 热力条与原生压缩。
- app-server stderr、Warning、Guardian、配置、弃用、模型和 Sandbox 通知均已消费；日志、通知、资源预览、用户输入和可见 Turn 均有硬上限。

## 当前风险

- app-server `stopped` 事件没有进程 PID/代际；快速停止并重启时，旧 reader 线程可能把新连接状态误判为已停止。自动断线恢复也尚未完成。
- Shell Queue 只存在当前进程内，应用退出后不会恢复；MCP 配置编辑、Skills/Plugin 管理和显式连接诊断尚未完成。
- `App.tsx` 与 `App.css` 均已超过 600 行，Composer/弹层编排和 feature 样式仍集中；`useThreadController.ts` 接近 500 行，Thread 元数据和通知协调继续扩展前应拆分。
- 文件预览会先经 IPC 读取完整文件再在前端截断；超大 Diff、单个超长活动和二进制 Diff 尚无源端截断或专用视图。
- Runtime 二进制未进入 Git，尚无可复现下载/构建流程；安装包、签名、CI、干净 Windows 环境 UAC/sidecar 验证均未完成。
- 模型设置只校验 `baseUrl` 和 `modelId` 的 `trim()` 结果，但当前仍保存原始字符串；用户输入首尾空白时可能造成后续 provider 或模型解析失败。

## 下一里程碑

1. 为 app-server 进程和事件增加代际标识，并实现断线后当前 Session 的可控恢复。
2. 把 Composer 状态/弹层编排从 `App.tsx` 拆为独立模块，并按 feature 迁移 `App.css` 样式；保持行为和测试快照不变。
3. 建立 CI、Runtime 获取/校验和安装包签名基线，在干净 Windows 用户环境验证 elevated Sandbox 与 sidecar。
4. 在 Runtime 侧或读取协议层增加大文件、Diff 和活动输出的源端预算，避免仅靠 DOM 端截断。

## 验证基线

- 2026-08-14：47 个 Vitest 文件、191 项测试通过；TypeScript、Vite production build、Knip 和 `cargo check` 通过，桌面 debug 构建成功。
- Rust 源码包含 11 项单元测试；本轮在独立 Cargo target 中执行测试后进入 Clippy，但 Clippy 未在工具超时内返回可记录的退出结果，因此不把 Clippy 计入本轮通过基线。
- 静态审查：Knip 未发现无效文件、导出或依赖；生产 TypeScript/CSS/Rust 未发现达到 6 行/60 tokens 的重复块。jscpd 报告 13 处重复全部位于测试夹具与场景搭建，整体重复行占 0.92%。
- `pnpm audit --prod` 无已知漏洞；源码扫描未发现 PAT、API Key、用户密钥或开发机绝对路径。
- 真实 app-server smoke 已覆盖多 Turn 恢复、并行 Thread、文件 RPC、Skills/MCP/Goal、Plan 和第三方兼容网关；这些证据对应固定 Runtime，不代表最新版 Codex 源码能力。
