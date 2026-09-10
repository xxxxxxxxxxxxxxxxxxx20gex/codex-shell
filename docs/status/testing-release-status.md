# 测试与发布状态
- 本次设置恢复修复的 `pnpm desktop:build` 通过（2026-09-10，包含 `pnpm build`），已更新本地 Debug 可执行文件；未生成生产发行物。Vite 主 chunk 大小提示仍存在。
- 设置窗口定向验证（2026-09-10）：`pnpm test` 62 个文件 / 303 项、`pnpm typecheck`、`pnpm lint`、`pnpm quality:knip`、`cargo check --manifest-path src-tauri/Cargo.toml` 通过；新增控制器最小化后重新打开回归，组件测试覆盖外部设置入口及恢复按钮保留草稿与最大化状态。`pnpm test:channel-layout` 使用真实组件与模拟回调，覆盖四视口列表、独立编辑、最大化、两条最小化恢复入口、Tab 循环、外部点击、Escape 与 reduced-motion。浏览器验证不替代真实 Tauri 端到端测试。

- 渠道审查（2026-09-10）：本次重跑 pnpm test，62 个文件 / 302 项通过。未使用真实 Key、未切换本机渠道；测试遗漏 App 激活 ID 更新、后台运行保护、Key/配置失败一致性、切换重启完成与异步校准竞争，因此不能据此宣称多渠道链路正常。完整旧基线保留其原日期，不冒充本次重新运行。
- 模块职责：维护类型检查、前端单元测试、Rust 校验、Windows 构建与发行物验证。
- 当前状态：公开稳定版本仍为 `v0.1.4`；当前版本已接入 Tauri Updater，设置中的“检查并更新”会校验正式 GitHub Release 签名后下载并在 Windows 上自动重启安装。个人发布通过 `pnpm release:package` 在本机暂存经过批准的 Runtime、生成签名 NSIS 安装包和 `latest.json`，再手动上传到同名 Release。
- 最近变更：扩展管理新增安全凭据配置、配置冲突、Skill 所有权、插件待认证状态及 MCP 关闭/监听释放测试；提供隔离 Runtime 和浏览器布局脚本。
- 当前接口：`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm quality:knip`、`pnpm test:quality`、`pnpm build`、`pnpm rust:check`、`pnpm runtime:stage`、`pnpm protocol:generate`、`pnpm runtime:probe-goal`、`pnpm runtime:probe-model-parameters`、`pnpm runtime:probe-local-tool`、`pnpm runtime:probe-extensions`、`pnpm test:extension-layout`、`pnpm test:channel-layout`、`pnpm desktop:build`、`pnpm desktop:package`。
- 已知问题：安装包尚未进行 Windows Authenticode 代码签名，仍缺 CI，以及超长活动输出和三栏拖拽的自动化覆盖。Vite 仍报告主 chunk 超过 500 kB。
- 下一步：建立 CI 和 Windows Authenticode 代码签名流程，并把 Runtime 兼容门禁纳入 CI。
- 验证证据：2026-09-10；`pnpm typecheck`、`pnpm lint`、`pnpm test`（62 个文件 / 301 项）、`pnpm quality:knip`、`pnpm build` 与 `pnpm rust:check`（Cargo check、31 项 Rust 单测、严格 Clippy）全部通过；新增真实 app-server 渠道目录探针，确认按渠道注入 `model_catalog_json` 后 `model/list` 返回对应目录。模型中转渠道设置与对话高级设置已通过 `pnpm test:channel-layout`（Playwright + 本机 Chrome，模拟回调）：1440×900、1280×780、1024×720、900×700 四档均无页面级横向溢出，模态框不越界，可见文字不小于 11px，键盘焦点可进入面板，删除二次确认、Escape 关闭和 reduced-motion 均生效；该脚本挂载真实组件但使用模拟回调，不是真实 Tauri 端到端。
- 验证证据：2026-09-09；TypeScript、ESLint、Vitest、Knip、Vite production build 通过。pnpm rust:check 的 Cargo check、16 项 Rust 单测、Clippy 通过；使用临时 CARGO_TARGET_DIR 的 tauri build --debug --no-bundle 成功，未中断旧 Debug 进程。runtime:probe-extensions 验证 Skills 持久化启停、MCP 版本化写入与删除/reload、本地 Marketplace/Plugin 安装卸载。test:extension-layout 通过 1440×900、1280×780、1024×720、900×700 的三页面布局、文字下限、焦点及 reduced-motion 检查（模拟 transport，非真实 Tauri 端到端）。
- 最后更新：2026-09-10
