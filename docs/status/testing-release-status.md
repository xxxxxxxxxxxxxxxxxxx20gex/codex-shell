# 测试与发布状态

- 兔子 Skill 验证（2026-09-14）：变量恢复 tuzi 命名后，`python -B tests/scripts/test_tuzi_skill.py` 5 项离线测试通过，覆盖新变量配对、旧 CS 变量不回退、请求提示词原样传递及既有 URL/密钥边界；`python -X utf8 quick_validate.py` 通过。TypeScript、production build、Cargo check、39 项 Rust 单测、严格 Clippy 与 Debug 构建通过。仅验证模拟请求，不代表模型一定遵循精简后的说明，也不代表真实生图、系统环境变量继承或已安装 Skill 升级已验收；本次未重跑前端全量测试及 Knip。
- Skill 卸载提示验证（2026-09-15）：Skill 管理页面仅显示“已卸载”，不向用户暴露后端恢复目录路径；定向组件测试覆盖成功状态及路径隐藏。

- 内置搜索工具验证（2026-09-14）：新增 Runtime PATH 边界与真实 PowerShell 搜索测试；Cargo check、39 项 Rust 单测、严格 Clippy、TypeScript、ESLint、64 文件 / 328 项 Vitest、production build 和 Debug 构建通过。`pnpm runtime:probe-tools` 验证不含官方 Codex PATH 的真实 app-server 命令执行链，无模型调用；staging 下载/缓存校验及错误来源拒绝通过。尚未进行 elevated Sandbox 和安装器验收。Knip 仍仅报告既有图片布局脚本未登记入口；Cargo fmt --check 仍有既有跨模块格式差异，不作全库格式化。

- 回复资源验证（2026-09-14）：TypeScript、ESLint、Vitest（64 文件 / 328 项）、Cargo check、Debug 构建通过。定向测试覆盖引用式链接、代码/外链排除、Windows 路径去重、过程图片延迟读取；共享批注窗口四视口脚本通过（含 Escape、外部点击、reduced-motion）。尚未做真实 Tauri 图片链接点击端到端验证。Knip 未通过：既有 `check-image-annotation-layout.mjs` 未登记入口；不将此项记为通过。

- 图片入口验证（2026-09-14）：TypeScript、ESLint、Knip、Vitest（63 文件 / 326 项）、production build、独立目标目录 Cargo check、Debug 构建通过。新增 `tests/scripts/check-image-annotation-layout.mjs`，四视口 1440×900、1280×780、1024×720、900×700 通过预览、添加批注、回填、Escape、外部点击与边界检查，并在 reduced-motion 环境执行；使用真实组件与模拟回填，不代表真实 API 或 Tauri 端到端验证。

- 模块职责：维护类型检查、单元测试、Rust 校验、Debug 构建和生产发布验证。
- 当前状态：公开稳定版为 v0.1.5，当前开发版本为 v0.1.6；生产安装器、Updater 签名及 latest.json 已上传 GitHub 并设为 Latest，三项远端 SHA-256 与本地一致，公开更新清单下载验证通过。Debug 已同步到 0.1.5。未配置 Windows Authenticode 证书，Updater 签名不消除未知发布者提示。
- 最近变更：发布版本 0.1.5 已完成，当前功能准备进入 0.1.6，修复签名命令经 pnpm 传递空密码时参数丢失的问题，使用 --password=。本机 NSIS 缓存初始化重命名失败，通过复制已校验工具及匹配官方哈希的插件恢复，不改应用逻辑。
- 当前接口：pnpm typecheck、pnpm lint、pnpm test、pnpm quality:knip、pnpm build、pnpm rust:check、pnpm test:channel-layout、pnpm desktop:build；生产发布命令和资产要求以 README 为准。
- 已知问题：真实 Windows Credential Manager 写入、迁移与真实多渠道 API 对话未在本次测试；跨存储断电一致性不由单测保证。仍缺 CI、Windows Authenticode 签名，以及超长活动和三栏拖拽自动化覆盖。Vite 主 chunk 仍超过 500 kB。
- 下一步：人工验收真实系统凭据和渠道对话；维持 Runtime 兼容门禁，完善 CI 与签名。
- 验证证据：2026-09-11；0.1.5 的 TypeScript、ESLint、Knip、Vitest（63 文件 / 317 项）、Cargo check、36 项 Rust 单测、Clippy、协议门禁及门禁负向回归通过。生产构建和 NSIS 打包成功；用应用公钥和 minisign-verify 验证安装器签名通过。未做干净机器安装、真实密钥迁移及远端对话验收。历史分页与运行中换模型限制仍见协议状态。
- 布局证据：2026-09-11；提供 Playwright 模块、Chrome 和本地 Vite 后，pnpm test:channel-layout 在 1440x900、1280x780、1024x720、900x700 全部通过；覆盖真实组件但使用模拟回调，不是真实 Tauri 端到端。
- Runtime 历史证据：2026-09-10 的既有探针确认 codex-cli 0.153.4 注入 DeepSeek model_catalog_json 后只返回对应目录；本次未重跑远端 API 探针，不以 /models 成功推断对话可用。
- 开发验证：2026-09-14 `/skills` 草稿保留修复；TypeScript、ESLint、Knip、Vitest（63 文件 / 322 项）、production build、Cargo check（使用独立 `.codex-shell-cargo-check` 目标目录）和 `pnpm desktop:build` 通过，Debug 已更新为 0.1.6。保留现有 Vite chunk 大小与 MSVC 链接信息警告。本次没有视觉布局变更，未重跑四视口及真实 API 验收。
- 最后更新：2026-09-14
