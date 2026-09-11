# 测试与发布状态

- 模块职责：维护类型检查、单元测试、Rust 校验、Debug 构建和生产发布验证。
- 当前状态：v0.1.5 生产安装器、Updater 签名及 latest.json 已在本机生成并验签，准备上传 GitHub；此前公开稳定版为 v0.1.4。未配置 Windows Authenticode 证书，Updater 签名不消除未知发布者提示。
- 最近变更：发布版本统一为 0.1.5，修复签名命令经 pnpm 传递空密码时参数丢失的问题，使用 --password=。本机 NSIS 缓存初始化重命名失败，通过复制已校验工具及匹配官方哈希的插件恢复，不改应用逻辑。
- 当前接口：pnpm typecheck、pnpm lint、pnpm test、pnpm quality:knip、pnpm build、pnpm rust:check、pnpm test:channel-layout、pnpm desktop:build；生产发布命令和资产要求以 README 为准。
- 已知问题：真实 Windows Credential Manager 写入、迁移与真实多渠道 API 对话未在本次测试；跨存储断电一致性不由单测保证。仍缺 CI、Windows Authenticode 签名，以及超长活动和三栏拖拽自动化覆盖。Vite 主 chunk 仍超过 500 kB。
- 下一步：人工验收真实系统凭据和渠道对话；维持 Runtime 兼容门禁，完善 CI 与签名。
- 验证证据：2026-09-11；0.1.5 的 TypeScript、ESLint、Knip、Vitest（63 文件 / 317 项）、Cargo check、36 项 Rust 单测、Clippy、协议门禁及门禁负向回归通过。生产构建和 NSIS 打包成功；用应用公钥和 minisign-verify 验证安装器签名通过。未做干净机器安装、真实密钥迁移及远端对话验收。历史分页与运行中换模型限制仍见协议状态。
- 布局证据：2026-09-11；提供 Playwright 模块、Chrome 和本地 Vite 后，pnpm test:channel-layout 在 1440x900、1280x780、1024x720、900x700 全部通过；覆盖真实组件但使用模拟回调，不是真实 Tauri 端到端。
- Runtime 历史证据：2026-09-10 的既有探针确认 codex-cli 0.153.4 注入 DeepSeek model_catalog_json 后只返回对应目录；本次未重跑远端 API 探针，不以 /models 成功推断对话可用。
- 最后更新：2026-09-11
