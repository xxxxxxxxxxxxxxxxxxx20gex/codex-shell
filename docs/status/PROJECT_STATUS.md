# 项目总状态

- 当前阶段：Milestone 2 - P0 桌面编程工作台
- 总体状态：核心对话、Session、工具活动、审批、文件、Diff 和模型配置可用；发布工程与 Runtime 恢复能力尚未完成。
- 文档原则：本文件只记录跨模块当前基线、风险和下一里程碑；历史变更以 Git 提交和各模块状态文档为准，不在此累积功能流水账。
- 最后更新：2026-08-20

## 当前基线

### UI 设计基线

- 生产界面已完成 Quiet Graphite Workbench 设计系统收敛：画布、侧栏、面板、边框、文字、状态色和上下文热力刻度均由 `src/styles/tokens.css` 统一拥有；主题敏感颜色直接消费 canonical Token，不再通过会冻结根级深色计算值的过渡别名；有意义文本从 11px/16px 起步，标准图标统一为 Lucide 16px/1.75px，组件圆角使用 4/6/8px 角色。
- 主会话使用固定 48px 标题栏；时间线最大可读宽度 820px；Composer 最大宽度 860px 并居中；侧栏默认 248px，检查器默认 288px 且默认收起。1180px 以下检查器以 overlay 打开，900px 以下侧栏也以独立 overlay 打开，不再通过 `display:none` 删除功能入口。
- Windows 使用 32px 产品自绘无边框标题栏，保留窗口拖动、双击切换最大化、最小化、最大化/还原和关闭；窗口 capability 限制为上述必要动作。
- 产品标题只在窗口标题栏出现一次；侧栏顶部采用无边框图标+文字操作，当前提供新建对话，插件入口作为禁用的扩展预留。
- Turn 从发送成功起统一显示“正在处理 + 实时耗时”，活动状态使用固定 5px 实心点进行透明度呼吸；真实回答出现后才在首个回答块首行显示亮色 2px 标记，完成态不增加贯穿正文的灰色侧轨。`App.tsx`、`useAppController.ts` 和 `App.css` 均保持在约 500 行以内，Explorer、Command、Runtime 等样式由 feature 自有文件承载。
- 侧栏底部根据 Base URL 动态显示当前 provider 简称并打开通用设置；设置包含个性化提示词、外观、运行环境和诊断，模型网关仍由 Composer 模型菜单的高级入口管理。右侧栏只负责文件变更审查，不再混入 Session 状态、环境配置或日志。

### 架构与隔离

- 桌面壳使用 Tauri 2、React、TypeScript 和 Rust，不修改 Codex Core；智能体执行只通过原版 `codex app-server` 的 stdio JSON-RPC 完成。
- Runtime 固定为 `codex-cli 0.148.0-alpha.15`，Code Mode Host 和两个 Sandbox helper 与主程序同版固定，稳定 v2 类型由同一 Runtime 生成；Plan 仅使用最小范围的实验字段适配。
- CODEX_HOME 默认位于用户目录下的 `.codex-shell`，配置、凭据、SQLite、Session、缓存和默认项目均与官方 Codex 隔离；源码不包含开发机绝对路径。
- API Key 只保存在 Windows Credential Manager，并通过子进程环境变量注入独立 provider；前端没有读取明文凭据的接口。

### 对话与 Session

- 支持 Thread 创建、只读打开、按需 Resume、分页历史、重命名、固定、归档、恢复、删除、按任一已完成 Turn 精确 Fork，以及 rollout 路径/ID 复制。置顶使用 app-server 内置 Pinned Thread Section；Session 变更使用同步互斥锁和 token 丢弃过期响应，不与发送、切换或其他 Session 操作并发；归档无需二次确认，永久删除仍需二次确认。
- 多个 Session 可并行运行；当前 Session 的普通补充消息进入每 Session 最多 10 条的内存 Queue，显式 `Ctrl/Cmd+Shift+Enter` 使用原生 `turn/steer`。
- 模型、推理强度、沙盒范围和审批者随下一次 `turn/start` 生效，不因参数切换创建新 Session；Queue 会快照入队时的权限和模型设置。
- 个性化提示词独立保存到应用配置目录，只在创建新 Session 时通过原生 `developerInstructions` 传递；不会改写已有 Session，也不会在空配置时增加 Shell 提示词。
- 前端只保留当前 Session 最近 200 个 Turn，关联 Diff、Plan 和流式状态同步裁剪。

### Composer 与能力入口

- Composer 上方的待发送 Queue 是独立面板，输入框不再与队列共用边框；Composer 左侧为统一 `+` 菜单和权限，右侧为模型、推理强度和发送；模型与权限只在悬停或聚焦时显示交互区域。
- `+` 菜单统一提供文件、Skills、MCP、压缩、计划、目标和 Review；键入 `/` 仍支持过滤、方向键选择和 Enter 执行。
- Goal 与 Plan 是 Composer 中互斥的单标签模式：Goal 在主输入框定义目标并复用原生 continuation，Plan 使用 `collaborationMode=plan`；进入 Plan 会清除活动 Goal，不存在 Shell 自建 Goal 执行循环。
- 权限按 app-server 原生沙盒分为只读、工作区写入、完全访问；自动风险审查是独立审批者设置，默认仍为完全访问。
- 模型目录和推理强度来自 `model/list`；网关、API Key、自定义模型、推理摘要、回答冗余度和模型目录声明的服务层级位于高级设置。新安装默认不覆盖 Core/模型目录参数，不展示当前 Core 无法传给上游的伪设置。

### 时间线、文件与诊断

- 时间线按 app-server 原始顺序展示用户/助手消息、推理、计划、命令、文件、MCP、动态工具、搜索、图片和子智能体活动；回答只在首个回答块首行显示亮色 2px 标记，不再显示贯穿完成回答的灰色侧轨；助手正文提高阅读对比度，Markdown fenced code 以语言标题栏、复制按钮和独立代码正文稳定识别，无语言时显示“纯文本”；耗时显示为紧凑的 `s`/`m s` 格式，临时重连状态归入当前 Turn 的中间处理过程；命令默认折叠，文件修改在回答末尾汇总。
- 运行中显示“正在处理”和实时耗时，完成后冻结服务端或本地生命周期计算出的最终耗时；长 Session 使用可变高度虚拟列表。人在底部时流式回答和活动高度变化持续贴底，主动上滑后停止自动跟随，“返回最新”直接定位到最后消息底部。
- 新 Thread 未选择项目时使用 `Documents/Codex-Shell/YYYY-MM-DD`，自定义项目只在首条消息前可选；已有 Thread 始终使用服务端返回的 `cwd`。
- 支持文件/图片附件、剪贴板图片、拖拽、`@` 文件引用、项目浏览和预览、目录 watch、实时/历史 Diff、上下文 Token 热力条与原生压缩。
- app-server stderr、Warning、Guardian、配置、弃用、模型和 Sandbox 通知均已消费；日志、通知、资源预览、用户输入和可见 Turn 均有硬上限。

## 当前风险

- app-server 自动断线恢复尚未完成；当前代际隔离可以阻止旧进程延迟事件污染新连接，但不会主动重启崩溃进程或恢复进行中的 Turn。
- Shell Queue 只存在当前进程内，应用退出后不会恢复；MCP 配置编辑、Skills/Plugin 管理和显式连接诊断尚未完成。
- `useAppController.ts` 接近 500 行；继续扩展 Composer 编排前应按附件、文件 mention 和命令状态拆分，避免重新形成高频单体入口。Thread 元数据操作已从 `useThreadController` 拆入 `useThreadActions`。
- 文件预览会先经 IPC 读取完整文件再在前端截断；超大 Diff、单个超长活动和二进制 Diff 尚无源端截断或专用视图。
- Runtime 二进制未进入 Git，尚无可复现下载/构建流程；Code Mode Host 已在本机 debug 目录和真实工具探针中验证，但安装包、签名、CI、干净 Windows 环境 UAC/sidecar 验证仍未完成。

## 下一里程碑

1. 实现 app-server 断线后当前 Session 的可控恢复，并明确进行中 Turn 的失败与重试边界。
2. 把 Composer 状态/弹层编排从 `App.tsx` 拆为独立模块，并按 feature 迁移 `App.css` 样式；保持行为和测试快照不变。
3. 建立 CI、Runtime 获取/校验和安装包签名基线，在干净 Windows 用户环境验证 elevated Sandbox 与 sidecar。
4. 在 Runtime 侧或读取协议层增加大文件、Diff 和活动输出的源端预算，避免仅靠 DOM 端截断。

## 验证基线

- 2026-08-20：Runtime 对齐到 `0.148.0-alpha.15` 并启用同版 Code Mode Host；真实低推理 `gpt-5.6-sol` 网关 Turn 产生两次 `commandExecution` 后正常完成。`pnpm test:quality` 覆盖 52 个 Vitest 文件/238 项测试、14 项 Rust 测试、TypeScript、ESLint、Vite production build、Knip、Cargo check、严格 Clippy 和 diff 检查并全部通过。

- 2026-08-20：浅色与跟随系统主题的颜色别名迁移后，`pnpm test:quality` 通过，覆盖 52 个 Vitest 文件/238 项测试、14 项 Rust 测试、TypeScript、ESLint、Vite production build、Knip、Cargo check、严格 Clippy 和 diff 检查；浏览器运行时确认浅色选中背景、正文、边框和强调色分别解析为 `#dce4d8`、`#1c211d`、`#d7ddd7` 和 `#628b19`，深色 Token 保持原值，1440×900、1280×780、1024×720 和 900×700 无页面级横向溢出。
- 2026-08-20：右栏收敛为单一文件变更审查区，环境与诊断能力迁入设置；当前基线 `pnpm test:quality` 通过，覆盖 52 个 Vitest 文件/238 项测试、14 项 Rust 测试、TypeScript、ESLint、Vite production build、Knip、Cargo check、严格 Clippy 和 diff 检查。
- 2026-08-18：代码健康审查及可重试错误生命周期修复后完整 `pnpm test:quality` 通过，覆盖 ESLint 零 warning、53 个 Vitest 文件、229 项测试、TypeScript、Vite production build、Knip、`git diff --check`、`cargo check`、13 项 Rust 单元测试和严格 Clippy；无边框桌面 debug 构建成功。`error.willRetry=true` 只在匹配 Turn 重试期间展示，完成后自动清除且不跨 Session；同时修复了 app-server 监听器初始化失败后的状态恢复和旧 disposer 误删新 handler 的风险。Headless Edge 最近一次已验证 1440×900、1280×780、1024×720、900×700 和 899×700 的布局边界。
- 静态审查：Knip 未发现无效文件、导出或依赖；归档/删除清理流程的 TypeScript 重复已合并。jscpd 仅保留主题系统中深色与浅色语义变量的 1 处 CSS 重复（21 行，整体重复行占 0.21%），属于媒体查询下的必要主题覆盖。
- `pnpm audit --prod` 无已知漏洞；源码扫描未发现 PAT、API Key、用户密钥或开发机绝对路径。
- 真实 app-server smoke 已覆盖多 Turn 恢复、并行 Thread、文件 RPC、Skills/MCP/Goal、Plan 和第三方兼容网关；这些证据对应固定 Runtime，不代表最新版 Codex 源码能力。
