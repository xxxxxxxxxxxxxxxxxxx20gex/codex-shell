# 测试与发布状态

2026-10-08 模型提示修复基线：`pnpm test:quality` 通过（403 项前端、34 项高德、51 项 Rust 测试，1 项交互测试忽略）；新增回归验证缓冲解除和终止清理、跨会话提示隔离。Edge 四尺寸 Composer／提示布局、Debug 构建及 0.160.1 Runtime 哈希校验通过。模型事件使用模拟通知验证，未触发真实网关安全缓冲或重路由；行为边界见 [客户端状态](app-server-client-status.md)。

2026-10-07 当前升级基线：main 使用官方稳定版 `codex-cli 0.160.1`，主程序及三个同源 helper 已通过 manifest SHA-256 校验；875 个生成协议文件无变化，101 处调用／订阅兼容门禁通过。`pnpm test:quality` 全部通过：400 项前端、34 项高德离线和 51 项 Rust 测试（1 项交互测试忽略）、TypeScript、ESLint、production build、Knip、Cargo check、严格 Clippy 及 diff 检查。设置／队列、Goal、0.159.2 到 0.160.1 的隔离历史升级与迁移探针通过；Debug 构建、sidecar 哈希及内置 rg 探针通过。首次 Rust 测试因临时 WebView2 静态库缓存缺失失败，移走该依赖缓存后全量重跑通过。安全回归覆盖目录隔离、凭据失败补偿、MCP 环境变量保护、渠道 URL 和图片输入校验。未启动真实用户 CODEX_HOME，未验证真实网关图片续答、大型旧库及 elevated Sandbox；本次不宣称此前图片回传问题已修复。公开 v0.1.9 发布资产不变。以下较早日期记录仅保留其专项验证范围。

2026-10-05 image-gen 定向验证：本地预览 3 项与原生图脚本 11 项 Python 测试、内置及已安装 Skill 格式校验、TypeScript、production build、Cargo check、51 项 Rust 单测（1 项忽略）、Clippy、Debug 构建及 Runtime 哈希核验通过。预览覆盖缩放、透明背景、EXIF、防覆盖和非法输入；未执行收费生图或真实网关视觉续答，不代表断流已修复。

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界。模块行为由对应状态文档维护，历史测试流水账由 Git 保留。
- 当前状态：main 使用 `codex-cli 0.160.1`，完整质量门禁通过；公开 v0.1.9 保持升级前的发布基线。Updater minisign 已启用，Windows Authenticode 尚未配置，SmartScreen 仍可能提示未知发布者。
- 当前接口：`pnpm test:quality` 依次执行 TypeScript、ESLint、Vitest、`pnpm test:amap`、production build、Knip、`pnpm rust:check` 和 diff 检查。协议、Runtime、四视口布局和 Skill 专项验证独立运行，入口见 [测试脚本说明](../../tests/scripts/README.md) 与 `package.json`。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；Vite 主 chunk 超过 500 kB；`cargo fmt --check` 尚未纳入门禁。真实 WebView2 手写触控、系统凭据和第三方外部服务仍未完成人工验收。
- 下一步：补真实系统凭据、多渠道对话、第三方 MCP OAuth，以及干净 Windows 用户环境安装和升级验收。
- 最后更新：2026-10-07

2026-10-03，修正加号菜单中绘图命令加入后的失效数量断言；`pnpm test:quality` 全部通过，包括 72 个 Vitest 文件、400 项前端测试、生产构建、Knip、Cargo check、Rust 测试及 diff 检查。草图定向 Edge 探针与 Debug 构建继续通过，Debug Runtime manifest 为 `codex-cli 0.159.2`。

2026-10-03，草图自由画笔和橡皮擦改为逐段平滑绘制：附件定向 13 项 Vitest、Edge 四尺寸与 150% DPI 绘制探针、TypeScript、ESLint、production build、Knip、Cargo check 和 Debug 构建通过；Debug Runtime manifest 为 `codex-cli 0.159.2`。全量 Vitest 为 72 个文件中 71 个通过、400 项中 399 项通过，唯一失败仍为既有加号菜单数量旧断言。真实 WebView2 手写触控未人工验收。

2026-10-03，草图尺寸轨道改为笔触粗细预览：附件定向 13 项 Vitest、Edge 四尺寸布局/键盘端点及截图检查、TypeScript、ESLint、production build、Knip、Cargo check 和 Debug 构建通过；Debug Runtime manifest 为 `codex-cli 0.159.2`。全量 Vitest 为 72 个文件中 71 个通过、400 项中 399 项通过，唯一失败仍为既有加号菜单数量旧断言。真实 WebView2 草图交互未人工验收。

2026-10-03，草图保存不再自动写入固定文字：附件/输入定向 16 项 Vitest、TypeScript、ESLint、production build、Knip、Cargo check 和 Debug 构建通过；Debug Runtime manifest 为 `codex-cli 0.159.2`。全量 Vitest 为 71 个文件中 70 个通过、399 项中 398 项通过，唯一失败仍为加号菜单数量旧断言。真实 WebView2 草图保存尚未人工验收。

2026-10-03，失败 Turn 与顶部错误提示去重：`useThreadController` 定向 28 项 Vitest、TypeScript、ESLint、production build、Knip、Cargo check 和 Debug 构建通过；Debug Runtime manifest 校验为 `codex-cli 0.159.2`。全量 Vitest 为 71 个文件中 70 个通过、397 项中 396 项通过，唯一失败仍为上述加号菜单旧断言。未做真实 WebView2 失败回合人工验收。

2026-10-03，修复 Core `file://` 图片路径的过程资源与活动预览；相关 18 项 Vitest、TypeScript、ESLint、production build、Knip、Cargo check、Debug 构建及 Runtime manifest 校验通过。全量 Vitest 为 71 个文件中 70 个通过、396 项中 395 项通过；唯一失败为上述加号菜单旧断言，与本次资源路径改动无关。首次 Cargo check 因运行中的旧 Debug 程序占用构建产物报“拒绝访问”，Debug 脚本停止本项目旧进程并构建后重跑通过。未做真实 WebView2 图片预览人工验收。

2026-10-01，新增 Markdown 代码块四尺寸 Edge 布局探针，验证短代码收拢、长行内部滚动、复制按钮焦点和截图；对应模块事实见 [任务时间线](timeline-status.md)。

2026-10-01，输入区探针扩展到真实待发送列表、添加、权限与发送控件，四尺寸 Edge 检查与截图复核通过；新增队列组件 5 项定向测试通过，覆盖编辑／删除、菜单交互、失败保留、重复点击保护、恢复发送与附件预览。TypeScript、ESLint、生产构建和 Cargo check 通过；该次定向验证不替代真实 WebView2 队列链路验收，布局与组件事实见 [桌面 UI](ui-shell-status.md)。

2026-10-01，输入区四尺寸 Edge 探针新增右上角高度手柄验证：向上拖动增高且底部固定、64–320px 限制、上下键和 Escape 均通过，截图已复核；TypeScript、ESLint、生产构建和 Cargo check 通过。未进行真实 WebView2 人工拖拽验收。

2026-10-02，草图编辑器视觉更新完成：浮动工具胶囊、左侧尺寸滑杆、底部颜色色板和紧凑 footer 已通过 TypeScript、production build 与 Cargo check；本轮尚未完成四视口真实浏览器探针和 WebView2 手写触控验收。当时全量 lint 受 `TurnResourceOutputs.tsx` Hook 依赖告警影响，该告警已于 2026-10-03 修复。

## 当前验证基线

2026-10-02，0.159.2 升级后审查修复通过 `pnpm test:quality`；最终基线：71 个文件 / 391 项前端测试、34 项高德离线测试、生产构建、Knip、Cargo check、Rust 51 项单测（1 项交互测试忽略）、严格 Clippy 和 diff 检查。新增回归覆盖侧聊分页分叉、回退通知去重及重置后迟到响应、已提交回退的刷新失败、入队确认前撤回、删除失败／已消费状态、取消期间会话互斥、原生队列恢复和清理 Thread 后的迟到队列响应。已删除旧 Runtime 的本地队列发送和伪能力检测分支。本轮四尺寸 Edge Composer／队列检查通过；附件与托管图片四尺寸验证沿用升级时证据。

0.159.2 同源 Runtime 兼容门禁、隔离设置／队列协议探针、新旧历史升级探针、Goal 和内置 rg 探针通过。旧版 fixture 验证官方 CLI 与启动后台迁移，随后测试恢复、分页、回退替换、普通分叉、分页临时侧聊分叉及实际发送和冷恢复；所有模型请求均到本机模拟 Responses 网关，不接触真实用户数据或收费模型。

审查修复后的 `pnpm desktop:build` 已通过，Debug 主程序及同目录 sidecar 为 0.159.2 适配版本；本次未启动真实用户 CODEX_HOME。实测发现并修复增量构建遗留旧 sidecar：在 Debug 输出放入旧内核、只触碰暂存二进制后重建，输出被更新到 0.159.2，主程序及三个 helper 的 manifest 哈希核验通过；修改 build.rs 后重新运行 Rust check／单测／Clippy 通过。

本轮协议／边界回归覆盖三页历史分页顺序、20 MiB 图片／PDF 预览上限、HTTPS／本机回环 HTTP 渠道校验和 `thread/project/updated` 的权威 Thread 刷新。图片/PDF 当前仍由 app-server `fs/readFile` 完整返回后才判断大小，尚未实现源端分段读取。

## 未覆盖范围

- 真实 Windows Credential Manager 故障注入、真实第三方 MCP OAuth、真实生图／高德 API 的账号权限与配额。
- 干净机器安装升级、跨实体显示器、完整 WebView2 工具栏交互、超长 Diff／活动性能验收。
- 源端分段读取超大文件、真实模型与完整 WebView2 消息编辑链路，以及真实大型旧库迁移。

模拟 Runtime、浏览器探针和局部手工检查不替代上述验收。模块定向证据分别见 [Runtime](runtime-status.md)、[协议](protocol-status.md)、[扩展能力](agent-capabilities-status.md)、[项目与线程](workspace-thread-status.md)、[桌面 UI](ui-shell-status.md)、[模型配置](model-config-status.md)、[凭据](credentials-status.md) 和 [时间线](timeline-status.md)。

## 最近发布

v0.1.9 使用 `codex-cli 0.154.0-alpha.6.2` 同源 Runtime，发布资产为 NSIS 安装器、`.sig` 和 `latest.json`。2026-10-01 本机打包通过 Runtime 哈希及协议兼容门禁；独立使用配置中的既有公钥验证安装器 minisign 签名、可信注释签名、manifest 版本及下载地址均通过。精确资产校验和发布记录由 GitHub Release 保留，不在状态文档重复。

v0.1.9 发布基线为 370 项前端测试、34 项高德测试及 51 项 Rust 测试通过，Debug 与签名安装包均构建完成；GitHub 三项资产已正式公开。内核升级在 main 后续提交中交付，不覆盖 v0.1.9 的 tag、发布分支或安装器。
