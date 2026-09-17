# 测试与发布状态

- 模块职责：维护类型检查、静态检查、前后端测试、构建、Runtime 兼容门禁和 Windows 发布证据。
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
- 最后更新：2026-09-17
