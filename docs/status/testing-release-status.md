# 测试与发布状态

- 局部代码清理与 Debug（2026-09-20）：移除内置 Skill 私有安装辅助函数上未注册的 Tauri 命令宏，三个公开安装命令不变；清理后 Cargo check、43 项 Rust 单测（1 项忽略）及严格 Clippy 通过，`pnpm desktop:build` 成功生成 0.1.7 Debug。全项目 Knip 未发现未使用文件、导出或依赖；未因模块行数或格式偏好扩大重构。

- 当前开发完整验证（2026-09-20）：`pnpm test:quality` 通过：TypeScript、ESLint、68 文件 / 372 项前端测试、14 项高德 Bun 测试、production build、Knip、Cargo check、43 项 Rust 单测（1 项交互测试忽略）、严格 Clippy 和 diff 检查。高德离线测试已接入完整门禁，运行门禁需安装 Bun；新增覆盖安装完成但默认禁用失败、有效状态仍启用、响应正文超时、403 不重试、503 重试及网络错误脱敏和计时器释放。前三类缺陷测试在修复前复现失败、修复后通过。四尺寸扩展布局通过，未执行真实高德 API 或 WebView2 人工验收，保留 Vite chunk 体积警告。

- 高德地图内置 Skill（2026-09-20）：TypeScript、ESLint、前端 68 文件 / 370 项测试、Skill 校验、Cargo check、43 项 Rust 单测（1 项交互测试忽略）、严格 Clippy、production build 和 Debug 构建通过。`pnpm test:amap` 对应 Bun 离线测试 10 项通过，覆盖缺密钥、非法输入、业务及网络错误和错误信息不含测试密钥；真实隔离 Runtime 验证高德 Skill 发现、中文元数据及禁用生效，四尺寸扩展布局通过。未调用真实高德 API、未验收 WebView2 安装点击或干净机器 Bun 环境。

- CS 文档中文展示与系统分组（2026-09-20）：TypeScript、ESLint、扩展管理 15 项测试、Skill 结构校验、Cargo check、production build 和 Debug 构建通过；四尺寸扩展布局检查通过。首次布局检查因预览服务未启动超时，启动后重跑通过；Python 命令别名不可用，改用本机 Conda Python 校验通过。未执行 WebView2 人工验收。

- 模块职责：维护类型检查、静态检查、前后端测试、构建、Runtime 兼容门禁和 Windows 发布证据。
- Skill 滑动开关验证（2026-09-18）：完整质量门禁通过，68 文件 / 361 项前端测试、43 项 Rust 单测通过（1 项忽略）；四尺寸浏览器验证三类技能列表、插件详情和弹窗，未安装开关数量、禁用及关闭状态符合预期。未执行真实 WebView2 人工验收；既有 Vite chunk 警告保留。
- Skill 操作区布局验证（2026-09-18）：Skill 列表和插件详情弹窗统一将启停滑动开关固定在最右侧，卸载、关闭等其他按钮位于左侧；窄窗口保持单行排列。四尺寸浏览器布局检查通过，覆盖 1440×900、1280×780、1024×720 和 900×700；Debug 构建产物已更新。未执行真实 WebView2 人工点击验收。
- 最后一条消息编辑界面验证（2026-09-18）：编辑历史消息时仅将原文载入普通 Composer 输入框，不再显示编辑提示条或“取消编辑”按钮；替换回合历史的控制器测试通过。`pnpm test:quality` 与 Debug 构建通过，保留 Vite 主 chunk 体积警告。
- 编辑路径代码清理（2026-09-18）：删除已无生产调用方的 `cancelMessageEdit` 控制器出口及对应旧测试分支；完整质量门禁仍为 68 个前端测试文件、361 项测试和 43 项 Rust 单测通过（1 项忽略）。
- CS Docs 内置 Skill 验证（2026-09-18）：新增 `bundled/skills/cs-docs`，安装包资源、Tauri 安装命令和 CS 内置列表均已接入；Skill 校验、68 个前端测试文件共 362 项测试、43 项 Rust 单测和 Debug 构建通过，扩展管理四视口布局检查通过。未进行新安装包上的人工 WebView2 点击验收。
- 扩展列表简化（2026-09-18）：`pnpm test:quality` 通过，68 文件 / 361 项前端测试、43 项 Rust 单测通过（1 项交互测试忽略），类型、ESLint、production build、Knip、Cargo check、Clippy 和 diff 门禁通过。新增内置 Skill 安装／卸载保持原组、同名个人技能来源区分、中文搜索，以及插件安装前后固定首项的测试。完整 App 样式下四尺寸列表分组、详情、弹窗与键盘回归通过，Debug 已重建。未重跑真实 API 或 WebView2 人工验收；原有 Vite chunk 警告保留。
- 插件详情修正（2026-09-18）：质量门禁通过，68 文件 / 358 项前端测试、43 项 Rust 单测通过（1 项交互测试忽略）。新增详情内安装成功后重新读取缓存路径、安装失败留页重试，以及未安装不显示开关的回归。浏览器脚本加载完整 App 样式后验证四尺寸预览、正文弹窗、已安装开关、标题字号、关闭、焦点恢复和 reduced-motion；真实 Runtime 扩展探针及最终 Debug 构建通过。未进行 WebView2 人工点击验收，Vite 主 chunk 体积警告保留。
- 插件详情验证（2026-09-17 至 2026-09-18）：`pnpm test:quality` 通过，68 文件 / 356 项前端测试、43 项 Rust 单测通过（1 项交互测试忽略），TypeScript、ESLint、production build、Knip、Cargo check、Clippy 与 diff 检查通过。真实 Runtime 扩展探针验证安装前 Skill 详情/正文以及安装后启停持久化；四尺寸浏览器验证详情布局、内容弹窗、Escape、外部点击和焦点恢复，Debug 构建完成。未进行真实 WebView2 人工验收，既有 Vite chunk 体积警告保留。
- CS Office 验证（2026-09-17）：`pnpm test:quality` 通过，67 文件 / 353 项前端测试、43 项 Rust 单测通过（1 项交互测试忽略）；TypeScript、ESLint、production build、Knip、Cargo check、Clippy 与 diff 检查通过。插件和三个 Skill 的官方结构校验通过；真实 app-server 在隔离临时 CODEX_HOME 中完成内置市场添加、插件安装、三个命名空间 Skill 发现、卸载和来源移除。插件管理页在四个规定视口的溢出、字号、焦点和 reduced-motion 检查通过，Debug 构建产物更新。未执行真实 PDF、DOCX、XLSX 生成或干净机器依赖验收，原有 Vite 主 chunk 体积警告保留。
- 当前文件高亮验证（2026-09-17）：`pnpm test:quality` 通过，67 文件 / 352 项前端测试、42 项 Rust 单测通过（1 项交互测试忽略）；TypeScript、ESLint、production build、Knip、Cargo check、Clippy 与 diff 检查通过。组件回归覆盖混用 Windows 路径分隔符时的父目录展开、当前项语义、高亮及首次滚动；四视口真实浏览器检查选中背景与左侧标记，最终 Debug 构建通过。未使用真实大型项目人工检查目录 watch 后的长列表滚动位置。
- 提示跳转与路径规范化验证（2026-09-17）：`pnpm test:quality` 通过，67 文件 / 351 项前端测试、42 项 Rust 单测通过（1 项交互测试忽略）；TypeScript、ESLint、production build、Knip、Cargo check、Clippy 与 diff 检查通过。定向测试覆盖 app-server 普通提示进入诊断、Sandbox 提示进入运行环境，以及相对/绝对/UNC 路径的 `..` 规范化和越过卷根拒绝；四视口资源菜单回归及 Debug 构建通过。未执行真实 app-server 错误注入或 WebView2 人工点击验收。
- 资源路径菜单验证（2026-09-17）：`pnpm test:quality` 通过，66 文件 / 348 项前端测试、42 项 Rust 单测通过（1 项交互测试忽略）。四视口浏览器验证文档链接、图片资源及文件变更复制出的绝对路径、键盘唤出、Escape、焦点恢复与既有菜单行为；最终 Debug 构建通过。测试使用模拟资源及 Chromium 剪贴板，未人工验收 WebView2 系统剪贴板。
- 内置目录验证（2026-09-17）：`pnpm test:quality` 通过，66 文件 / 346 项前端测试、42 项 Rust 单测通过（1 项交互测试忽略）；TypeScript、ESLint、production build、Knip、Cargo check、Clippy 与 diff 检查通过。扩展三页面四视口布局回归及 Debug 构建通过；未重跑真实 Runtime 扩展探针或 API 会话，原有 chunk 体积警告保留。
- 回复资源定向验证（2026-09-17）：`pnpm test:quality` 通过，66 文件 / 344 项前端测试、42 项 Rust 单测通过（1 项交互测试忽略）；新增项目外 Markdown 内部读取且不展开虚假目录、普通文档不进入回复图片预览的回归。四视口文件菜单脚本同时验证回复预览仅保留图片；未执行真实模型会话端到端。
- 审查验证（2026-09-17）：`pnpm test:quality` 通过（TypeScript、ESLint、66 文件 / 342 项前端测试、production build、Knip、Cargo check、42 项 Rust 单测、1 项交互测试忽略、Clippy、diff 检查）；右键四视口回归和最终 Debug 构建通过。21 份入口及 docs Markdown 的本地链接目标均存在（不校验标题锚点及远端 URL）。未重跑真实 API、Runtime 兼容探针或其他模块布局，原有主 chunk 大于 500 kB 的警告保留。
- 代码健康审查（2026-09-17）：全项目 Knip 未发现未使用文件、导出或依赖；重点复核右键/剪贴板/弹层监听释放、文件 watch 清理及 Runtime 日志/通知/Turn 上限。修复复制降级路径抛错时遗留隐藏 textarea 和焦点丢失；合并菜单复用逻辑后未保留旧组件空壳。清理项目快照中过期验证流水账，修正布局脚本数量。未执行所有业务逐行审计，保留现有协议和迁移兼容路径。
- 右键策略定向验证（2026-09-17）：前端 65 文件 / 339 项测试、TypeScript、ESLint、Knip、production build 通过；四视口 `test:explorer-menu-layout` 覆盖页面菜单屏蔽、正文复制及既有文件菜单。Cargo check、42 项 Rust 单测和 Clippy 通过，1 项交互桌面测试按默认规则忽略。三项输入菜单、受控文本粘贴与撤销、图片粘贴事件、剪贴板失败与父弹层边界有回归；真实 WebView2 剪贴板权限未作人工验收；不替代下述发布兼容基线。
- 资源管理器定位（2026-09-17）：Cargo check、42 项 Rust 单测与 Clippy 通过；新增默认忽略的交互桌面定位测试，本机显式执行通过，普通路径和中文/空格路径经 Shell COM 确认父目录及选中项。TypeScript 通过。
- 文件树菜单定向验证（2026-09-16）：新增 `pnpm test:explorer-menu-layout`，四个规定视口的菜单边缘避让、键盘与外部点击关闭通过；前端全套 332 项测试通过，Rust 42 项单测、check 与 Clippy 通过。此项不替代下述发布基线。
- 当前状态：`main` 开发版本为 `0.1.7`，公开稳定版为 `v0.1.6`。v0.1.6 的 NSIS 安装器、Updater 签名和 `latest.json` 已上传 GitHub；安装器未配置 Windows Authenticode，SmartScreen 仍可能提示未知发布者。
- 最近变更：终端空 stdin 轮询不再进入时间线，非空交互进入默认折叠组；剪贴板图片保存到隔离 CODEX_HOME 后作为 `localImage` 输入，Tauri 边界限制 MIME 与 20 MiB 单张大小；项目文件使用独立的 400px 默认 Inspector 宽度。生成协议与暂存 Runtime 已更新到 codex-cli 0.154.0-alpha.6.2，并补充 MCP userVerification 拒绝路径回归。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm build`、`pnpm rust:check`、`pnpm test:protocol-surface`、五项四视口布局脚本、`pnpm desktop:build` 和 `pnpm release:package`。
- 已知问题：真实 Windows Credential Manager、多渠道 API 对话、第三方 MCP OAuth 和干净机器升级未在本轮自动测试；仍缺 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖。Vite 主 chunk 超过 500 kB。`cargo fmt --check` 尚未纳入质量门禁，现有 Rust 文件仍有格式差异。
- 下一步：在干净 Windows 用户环境抽查安装与从 v0.1.5 更新；继续补真实系统凭据、多渠道 API 对话和第三方 MCP OAuth 人工验收。
- 验证证据：2026-09-16；`pnpm test:quality` 通过：TypeScript、ESLint、Vitest（64 文件 / 330 项）、production build、Knip、Cargo check、42 项 Rust 单测、严格 Clippy 和 `git diff --check` 均通过；协议表面门禁、codex-cli 0.154.0-alpha.6.2 兼容门禁、本地模拟网关协议探针和 Debug 构建通过。扩展、渠道、图片批注和终端交互四项布局脚本均在 1440×900、1280×780、1024×720、900×700 通过。生产 NSIS 安装器、`.sig` 和 `latest.json` 已生成，manifest 版本与 URL 正确，安装器通过配置公钥验签并上传 GitHub Release。当前证据不代表真实模型、第三方 MCP 或干净机器安装升级已验收。
- 最后更新：2026-09-18

- 插件 Skill 归属与路径修复（2026-09-18）：独立 Skill 管理页按 pluginId 排除插件技能，/skills 仍展示已启用插件技能并标记来源。插件详情使用 skills/list 的安装路径，避免写入 plugin/read 的市场源路径。真实隔离 Runtime 探针通过禁用、重新打开、重启保持关闭、启用和卸载移除验证；前端全量 68 文件 / 368 项通过，最终定向 24 项通过。TypeScript、ESLint、Knip、Cargo check、production build、Debug 构建及 diff 检查通过；四尺寸浏览器验证列表分离和实际安装路径开关、详情、焦点及关闭行为。未执行真实模型对话或 WebView2 人工验收，保留 Vite chunk 体积警告。
