# 项目总状态

- 当前阶段：Milestone 2 — P0 桌面编程工作台
- 总体状态：P0 工作台与第一、第二阶段 app-server 原生能力接入已完成
- 最后更新：2026-08-14

## 已完成

- 已创建独立 Tauri 2 + React + TypeScript 项目，不修改 Codex Core。
- 已固定 `codex-cli 0.146.0-alpha.9.2` Runtime，并由同一二进制生成稳定 app-server v2 类型。
- Windows Sandbox 默认设置路径采用官方首选 `elevated` 模式；固定 Runtime 的 setup helper 与 command runner 会被动态发现、hash 记录并作为 Tauri sidecar 同目录分发。
- 已接通 `initialize → thread/start/resume/list → turn/start → item 通知 → turn/completed`。
- 已将会话状态建模为可增量合并的 `Thread → Turn → Item`，支持多轮发送、历史加载和失败状态。
- 已实现左侧最近 50 个非临时本地线程、线程切换与重启恢复。
- 已实现命令、文件修改、额外目录/网络权限的审批队列及三档权限模式。
- JSON-RPC 客户端已支持启动去重、30 秒请求超时、停止时拒绝 pending request、协议错误上报和可注入 transport。
- 已使用中性产品标识 `com.codexshell.desktop`；默认 CODEX_HOME 按官方 `~/.codex` 的命名规则落在 `~/.codex-shell`，支持自定义目录并禁止与官方目录重叠，应用配置、凭据、SQLite、sessions、缓存和默认工作区均与官方 Codex 隔离。
- 已修复历史来源过滤：独立 CODEX_HOME 内的 rollout 可能被 Runtime 标记为 `vscode`，历史查询不再硬编码 `appServer`。
- 已完成部署路径审计：项目源码不包含开发机仓库绝对路径；Runtime 按环境覆盖、可执行文件同目录 sidecar、PATH 动态解析并验证；构建脚本由 `$PSScriptRoot`、PATH/CARGO_HOME 拼接。
- 已为第三方网关定义独立 `codex_shell_gateway` provider，通过 `env_key` 从子进程环境读取 Windows Credential Manager 中的 Key，不再误用宿主 Codex 认证。
- 对话时间线已展示每轮发送时间、回答完成时间和回答耗时；运行中显示“正在处理”与从任务开始逐秒增长的耗时，完成后冻结最终值。时间优先复用 app-server 原生字段和通知，固定 Runtime 缺失时才使用 Shell 生命周期时间回退。
- 已压缩桌面纵向占用：移除无功能的应用品牌栏、会话标题栏和输入框底部提示，时间线显示区域扩大；模型入口统一为工具栏按钮，上下文热力条改为自下而上增长。
- 左右功能区均支持拖拽调整宽度和独立隐藏/恢复，中央对话区会自动占用释放的空间，并受最小可用宽度保护。
- UI 默认展开左侧 Session/项目栏、收起右侧功能区，并默认选择“完全访问权限”；用户仍可从分隔线和输入框工具栏随时调整。
- 右侧状态区已删除重复的 app-server 与审批策略卡片；CODEX_HOME 卡片支持选择自定义目录和恢复默认目录，切换时安全重启 app-server。
- 已消费稳定 v2 item/turn 通知，展示计划、推理、命令输出、文件变更、MCP、Web 搜索、图片与子智能体活动。
- 已用 `turn/diff/updated` 建立实时文件 Diff 面板，并从持久化 `fileChange` item 重建历史 Diff。
- 已接入系统目录选择器，新线程把用户选择的项目目录作为 `thread/start.cwd`；输入框通过稳定 `fuzzyFileSearch` 搜索，选择的本地文件以绝对路径和原生 `text_elements` 元数据进入用户输入，不再误用面向 `app://`、`plugin://` 和 `mcp://` 资源的 `mention`。
- 附件输入与展示已对齐官方桌面端的统一入口：加号菜单、拖拽和剪贴板图片共用附件模型；图片映射为 app-server 原生 `localImage`/`image`，普通文件把真实路径写入用户 `text` 并用 `text_elements` 持久化显示信息。Composer 和历史消息均显示图片缩略图或文件卡片，点击后复用 `fs/readFile` 预览图片、文本或二进制摘要；仅附件消息、Queue 和 Steer 使用同一输入构建逻辑，未新增系统或 developer prompt。
- 已完成游标分页、固定、重命名、单 Session 归档和永久删除。
- 左侧 Session 与中央对话区只展示稳定的 Session 名称；打开、修改、删除、分叉和复制仍只使用真实 Thread ID 或 rollout 路径，不使用会因列表变化而漂移的展示编号。
- 每个 Session 可复制 rollout 路径供其他智能体读取，路径缺失时回退真实 Thread ID；操作按钮统一使用居中 SVG 与 0.3 秒延迟说明。
- Session 历史列表继续提供 rollout 路径/ID 复制；“分叉 Session”与“复制回答”移动到当前已完成回答底部，避免把会话级操作混在历史列表中。
- Session 历史使用 app-server 原生 `forkedFromId` 建立真实父子层级：分叉会话自动排在父会话下方并以缩进、连接线和当前项指示线区分；欢迎空状态仅保留 Codex Shell 品牌展示，荧光黄绿色已统一降饱和。全局正文、输入内容、菜单和活动信息已提升为白色/近白色，辅助时间与路径保留更亮的灰色层级。
- 已将运行态从全局锁改为按 Thread 跟踪：一个 Session 等待回答时仍可新建、打开和操作其他 Session，并可同时运行多个 Turn；左栏和顶部显示并行运行状态，停止操作只作用于当前 Session。
- 运行中的补充消息默认通过 Queue 等待当前 Turn 完成；发送按钮悬停菜单也提供 app-server 原生 Steer，已排队消息可以直接转为 Steer 并从队列移除。命令执行项默认折叠，避免长命令输出在出现瞬间撑开对话区。
- 历史 Session 操作按钮固定在条目右侧的上层，不再悬停时向下扩展列表；长 Session 名称在操作区前截断并渐隐，保持文字与复制、固定、重命名、归档、删除按钮可读且不重叠。
- 已增加从左侧展开的项目文件浏览器：目录懒加载、已展开文件筛选、单击文本/图片预览、二进制提示和大文本截断；项目浏览与“选择项目”改为两个独立入口。
- 已增加 Codex 风格 `/` 命令菜单，接入稳定 `skills/list`、`mcpServerStatus/list`、`thread/compact/start` 和 `thread/goal/*`；Skill 作为原生输入发送，MCP/Goal 使用面板管理。
- 已消费 `thread/tokenUsage/updated`，在对话框左侧显示当前上下文蓝红热力条；悬停区分当前上下文与 Session 累计 Token，点击复用 `thread/compact/start`，自动压缩阈值仍完全由 Codex Core 根据模型元数据动态决定。
- 已完成全项目代码健康审查：保留完整生成协议，删除未使用客户端包装、返回字段和 Runtime 来源标签，统一压缩及发送收尾流程，收窄多余导出并合并重复 CSS；严格 TypeScript、Knip 与 Rust Clippy 均通过。
- 已通过最小 scoped experimental 适配启用真实 `/plan`：initialize 声明能力，只有 Plan Turn 附加 collaboration mode，默认 Turn 保持稳定请求结构，不生成或暴露整套实验 schema。
- 已将 Session 前端状态限制为最近 200 个 Turn，Diff 与 Plan 映射随裁剪同步释放；移除旧状态栏删除后遗留的 React 连接状态镜像。
- 已加固 CODEX_HOME 升级迁移：空的新默认目录仍迁移旧历史，双非空目录无损拒绝，默认真实路径同样禁止绕回官方 `.codex`。
- 已把 app-server 原生 Item 生命周期接入对话窗口：实时显示当前分析、命令、文件、MCP、工具和子智能体活动；Plan delta 与 MCP progress 流式更新，未引入轮询或自定义提示词。
- 已对齐官方桌面壳的项目目录语义：使用系统文档目录下独立的 `Codex-Shell/YYYY-MM-DD` 每日目录作为新 Thread 兜底；自定义项目只属于尚未发送首条消息的新对话，通过 Composer 上方的项目条选择、切换或取消，不再占用左栏或写入 `localStorage`；已有 Thread 始终使用自身 `cwd`。
- 已修复四项对话运行问题：用户消息气泡改为 `fit-content` 自适应并保留最大可读宽度；仅切换模型/推理参数不再重启 app-server，下一轮通过原生 `turn/start` 覆盖生效；权限模式随每轮 Turn 持续传给 app-server，避免完全访问模式在后续回合降级；历史分页刷新保留已知分叉祖先，避免父子缩进暂时消失。
- 归档和永久删除 Session 均增加产品内二次确认窗口，清楚说明可恢复性差异，并提供安全取消焦点、Escape 与遮罩关闭。
- 已确认原版 app-server 在隔离 CODEX_HOME 中原生记录 SQLite tracing 日志和 rollout 事件；一次 33.5 秒回合中壳层与 app-server 提交开销不足 1 秒，约 28 秒消耗在网关首个可见增量等待，后续回合另出现上游 overloaded 与 Core 原生重试。
- 已消费 Tauri `app-server://log`：右侧新增实时日志页，使用 200 条/单行 4000 字符硬上限和 150ms 批量刷新控制内存及渲染开销，并标注日志的敏感数据属性。
- 已完成阶段性代码健康审查：53 个非生成源码文件未发现达到阈值的复制代码，Knip 未发现无效文件、导出或依赖；Runtime 日志迁移到独立外部 Store，关闭日志页时不再带动最多 200 个 Turn 的主界面刷新；三栏缩放逻辑和日志样式从 `App` 拆出，并统一跨模块错误消息转换。
- 已完成本轮保持行为的代码健康审查：未发现可安全删除的业务死代码；Knip 无未使用项，事件监听、定时器、Store 和 app-server transport 均有释放路径。修复 Runtime staging 默认采用 PATH 最新版本导致固定协议漂移的问题，并改为临时目录校验完成后再替换 sidecar。
- 已完成最新一轮稳定性审查：继续固定 `codex-cli 0.146.0-alpha.9.2`，不升级 Runtime 或生成协议；修复 Composer 拖拽监听异步注册后的卸载清理竞态，附件菜单统一支持外部点击与 Escape 关闭，并清理 Queue 转 Steer 分支的缩进噪音。Knip、jscpd、依赖审计、敏感信息/绝对路径扫描、Rust Clippy 和完整回归均通过。
- 独立测试与质量门禁脚本统一收纳到 `tests/scripts`，提供 Rust 校验与一键质量门禁入口；源码旁的 TypeScript/Vitest 和 Rust 模块测试保持就地维护，便于复用模块夹具且不混淆测试脚本与构建脚本。
- 已完成第一阶段服务端交互与运行态接入：三类审批、结构化工具问答和 MCP elicitation 进入统一有界队列；真实 JSON-RPC request ID、服务端撤销、Thread 完整生命周期、通用/配置/Guardian/Windows 安全提示和 Sandbox setup 均复用 app-server 原生协议。
- 已完成第二阶段生产能力接入：原生模型目录与 Provider capabilities、Review、运行中 Steer、Thread Fork、活动/归档历史与恢复、`thread/read` 只读打开、按需 Resume 和空闲 Unsubscribe 已接入。
- 已对齐 Codex 桌面端的后续消息双路径：普通 Enter 按 Session 排队并在当前 Turn 成功完成后通过原生 `turn/start` 续发，显式 `Ctrl+Shift+Enter` 保留原生 `turn/steer`；队列可见、可取消、失败后可继续，且每 Session 有独立 10 条硬上限。
- MCP 面板已补齐 OAuth 登录、配置重载、工具与资源清单、资源读取预览；OAuth 和启动状态由原生通知反馈。未增加自定义 system/developer prompt，也未修改 Codex Core。
- 已完成提交前兼容性加固：模型可见文本统一限制为 8000 UTF-8 bytes；Runtime Notice、MCP 资源预览和外部 URL 均有硬边界；旧 paginated rollout 在原生只读接口不支持时只对固定错误回退 Resume。
- 已修复归档/活动历史串列、归档 Session 误打开、inline Review 合成 Turn 丢失和 detached Review 父线程订阅残留；`openai/form` 已通过 initialize 显式协商，typed form 按 schema 校验并省略未填写的可选字段。
- Thread 历史与 Review 生命周期已从主控制器拆为独立 Hook；通知路由测试也从 JSON-RPC 客户端测试中拆出，核心手写模块保持在约 500 行目标内。
- 已参考官方桌面壳完成 P0 对话体验优化：Turn 使用可变高度虚拟列表，流式输出仅在底部智能跟随，离开底部后显示新内容提示，并提供用户消息快速导航。
- 对话渲染已对齐 Codex 的连续流布局：同一回合连续助手消息不重复模型头部；命令活动保留 app-server 原生详情并改为轻量折叠行；文件修改项从中间活动流移动到回答末尾，按路径去重并显示文件类型及增删行统计。
- Diff 已支持新增、删除、重命名和修改的文件级摘要，非删除文件可直接在工作区浏览器定位预览；工作区通过稳定 `fs/watch/fs/changed/fs/unwatch` 自动刷新展开目录和当前文件，并完整清理订阅、listener 与防抖 timer。
- GitHub 交付已切换为 GitHub CLI 非交互凭据助手，并为本仓库固定本机 `7897` HTTP(S) 代理；完成并验证用户要求的改动后默认提交、推送，不再触发 GCM 图形确认。
- 已修复模型启动配置切换导致当前 Session 丢失：必要的 app-server 重启会保存当前 Thread ID，重连后通过原生 `thread/read` 恢复，下一轮继续在同一 Session 使用新模型。
- 已完成一轮 app-server 语义对齐审计：权限切换不再新建 Session；从完全访问降权时显式发送 `workspaceWrite`，避免沿用旧沙盒；历史 Resume 不再提前改写模型和权限，下一 Turn 的模型、推理与权限由 `turn/start` 原子生效；initialize 能力声明补齐显式 attestation 选择。Queue 明确为 Shell 当前进程内的有界队列，Steer 保持原生 `turn/steer`。
- 模型原生目录已收敛为单一名称展示，不再重复显示相同名称和 ID；助手回答移除模型侧头像与名称，改为左侧短高亮竖线，减少重复信息和横向占用。
- 模型入口已改为 Codex 风格两层结构：输入框旁即时选择 app-server 原生模型与推理强度，高级设置管理网关、Key、自定义模型和扩展参数；能力模板及静态模板目录已移除，所有参数变化均保持当前 Session。
- 对话执行体验进一步对齐 Codex 桌面端：同一 Turn 的 commentary、reasoning、命令与工具事件按原始顺序组成连续过程流，运行中显示 app-server 原生活动或 MCP progress，完成后使用稳定 `Turn.durationMs` 展示耗时；命令与工具逐项折叠，文件修改在回答末尾汇总，不生成服务端未提供的过程内容。消息轨道不再根据点击索引误判滚动到底，运行项展开和新输出不会把正在阅读历史的视口拉回。
- 用户可在普通 Turn 执行期间继续编辑并发送补充信息：Shell 复用原生 `turn/steer`，输入框显示轻量插入态；steer 返回的用户 Item 按时间顺序穿插在执行过程之间，不新建 Turn 或 Session。对话区左缘新增 Codex 风格消息轨道，当前可视 Turn 高亮且可点击跳转，不显示动态编号。
- 已修正前端壳对 app-server 运行状态的过度简化：按 Thread 区分普通、Review、Compact 和未知 active Turn，并消费等待批准/用户输入标志；只有普通 Turn 且有真实 Turn ID 时开放 `turn/steer`，其他阶段显示准确状态，不再出现“提示可插入、提交后才报错”的体验落差。普通 Turn 发送、Steer 与中断生命周期已从 `useThreadController` 拆到独立 Hook，主线程控制器回落到约 433 行。
- 已清理空 reasoning 的无内容折叠入口；对话执行区现按 app-server 原始顺序显示连续过程流，命令与工具仍保留各自的紧凑折叠详情。对话标题左边距收敛到 24px，中央对话正文、输入、过程标题和辅助文字按官方桌面端 16/14/12/11px 层级提升可读性。

## 当前数据流

`React 工作台 → TypeScript JSON-RPC 客户端 → Tauri command/event → 独立 CODEX_HOME 中的 codex app-server → 用户配置的 OpenAI 兼容接口`。

## 当前风险

- app-server 崩溃后的当前 Session 自动恢复、Shell Queue 跨重启持久化、超大文件预览/超大 Diff 的源端截断和 Office/PDF 专用渲染尚未完成；单个超长 Turn 内部活动尚未二次虚拟化。普通文件是供 Codex 工具读取的本地路径引用，不是直接上传到模型视觉上下文的通用 Blob。
- `useThreadController` 已拆出历史、Review 和普通 Turn 执行生命周期；Thread 元数据操作仍集中，继续扩充前应按操作族拆分。`App.tsx` 仍约 600 行，Composer 状态和面板编排是下一处明确拆分边界；`App.css` 仍包含多个 feature 的集中样式，应按实际功能改动渐进迁移。
- PATH Runtime 尚未校验与生成协议的版本/hash；旧进程无代际 `stopped` 事件、跨卷 CODEX_HOME 迁移和旧应用标识/凭据迁移仍存在兼容风险。
- 用户文本、Steer、Review、Goal 和结构化问答已在 Shell 边界限制为 8000 UTF-8 bytes；多 Skill 聚合、全局 `AGENTS.md` 和 Runtime Goal continuation 仍缺少统一硬预算，应优先在 app-server/Runtime 中建立不可绕过的中央边界。
- 旧 CODEX_HOME 的跨卷迁移仍需可恢复复制方案；当前同卷迁移和双目录冲突已按保数据原则处理。
- Runtime 自动获取、安装包、签名和干净 Windows 环境验证尚未完成。
- 实时 stderr 只保留当前窗口最近 200 条，不提供跨启动查询；长期诊断仍需直接读取 Core 的 `logs_2.sqlite`，尚未提供脱敏导出流程。

## 下一里程碑

先建立 app-server 断线恢复和进程代际，再评估 Plugin/Apps、Hooks、Skills 安装与 MCP 配置编辑；Account/额度、Realtime 和底层文件写删保持低优先级或明确不接。

## 验证证据

- `pnpm typecheck`：通过。
- `pnpm test`：46 个测试文件、183 项测试全部通过，覆盖项目目录选择/取消/锁定、Thread `cwd`、默认项目目录、文件浏览与 watch、附件输入/预览/历史还原、附件拖拽生命周期、执行过程实时计时与清理、Queue/Steer、模型/权限热切换与降权、Resume 无覆盖、分叉祖先、统一反向交互、Review 和 MCP。
- Rust 单元测试：11 项全部通过，覆盖显式模型参数、旧模板配置兼容归一化、动态 Runtime、每日默认项目目录、独立 provider 参数、旧 CODEX_HOME 迁移、双目录冲突和官方目录防重叠校验。
- `pnpm rust:check`：从 clean target 完整重编译后通过。
- `pnpm build`：包含虚拟时间线、目录 watch、目录选择插件和 P0 工作台 UI 的生产构建通过。
- Tauri debug build：构建通过，产物为 `src-tauri/target/debug/codex-shell.exe`；同目录三个 Runtime 文件名正确且 SHA-256 与 manifest 一致，此前从项目目录之外调用脚本的动态路径证据继续有效。
- 后台 app-server smoke：创建两个真实 turn、停止并重启 app-server、`thread/list` 找到线程、`thread/resume` 恢复 2 个 turn，独立 CODEX_HOME 通过断言。
- 后台并行 smoke：同一 app-server 中启动两个独立 Thread/Turn，观测到最大并发数 2 且两个 Turn 均完成；使用临时独立 CODEX_HOME，测试后自动清理。
- 后台文件 smoke：真实 `fs/readDirectory` 能列出临时工作区文件，`fs/readFile` 返回内容与源文件一致；临时目录测试后自动清理。
- 后台命令 smoke：真实 `skills/list`、`mcpServerStatus/list` 及 Goal set/get/clear 生命周期通过；Windows 句柄释放后临时目录已清理。
- 后台 Plan smoke：固定 Runtime 完成真实 Plan Turn，收到 192 条 plan delta 与 2 条 Plan item 通知；临时独立 CODEX_HOME 已清理。
- 新网关验证：`/models` 返回 21 个模型，配置模型存在，`/responses` 状态为 completed；使用独立 provider 的真实 app-server turn 完成，并将验证后的凭据同步到 Windows Credential Manager。
- 阶段性健康审查：Knip 零问题；jscpd 检查 72 个非生成源码文件，未发现达到 6 行/60 tokens 阈值的克隆；生产依赖审计无已知漏洞，TypeScript、production build 与 Rust check 通过。
