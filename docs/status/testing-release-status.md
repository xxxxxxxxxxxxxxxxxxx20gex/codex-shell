# 测试与发布状态

- 模块职责：维护类型检查、单元测试、Rust 校验、Debug 构建和生产发布验证。
- 当前状态：公开稳定版仍为 v0.1.4，使用 Tauri Updater 和本机生产打包流程；本次仅更新 Debug，不签名、不生成安装包、不修改 tag。
- 最近变更：渠道选择样式回归增加选中语义、管理入口与选择组分离、键盘触发跳转、控件高度和长名称截断检查。设置默认尺寸、关闭控制、渠道保存事务、配置原子替换与密钥失败补偿回归保留。
- 当前接口：pnpm typecheck、pnpm lint、pnpm test、pnpm quality:knip、pnpm build、pnpm rust:check、pnpm test:channel-layout、pnpm desktop:build；生产发布命令和资产要求以 README 为准。
- 已知问题：真实 Windows Credential Manager 写入、迁移与真实多渠道 API 对话未在本次测试；跨存储断电一致性不由单测保证。仍缺 CI、Windows Authenticode 签名，以及超长活动和三栏拖拽自动化覆盖。Vite 主 chunk 仍超过 500 kB。
- 下一步：人工验收真实系统凭据和渠道对话；维持 Runtime 兼容门禁，完善 CI 与签名。
- 验证证据：2026-09-10；pnpm typecheck、pnpm lint、pnpm quality:knip、pnpm test（63 个文件 / 313 项）通过；pnpm rust:check 的 Cargo check、36 项 Rust 单测及严格 Clippy 通过。pnpm desktop:build 成功，包含 pnpm build，输出 src-tauri/target/debug/codex-shell.exe。Rust 测试使用临时目录和内存凭据写入替身，没有修改真实用户密钥。
- 布局证据：2026-09-10；pnpm test:channel-layout 在 1440×900、1280×780、1024×720、900×700 通过，覆盖设置默认尺寸与视口约束、无最大化/最小化/恢复按钮、列表、独立编辑、渠道选中状态、独立管理入口及键盘触发、长名称截断、焦点、外部点击、Escape 与 reduced-motion。真实组件配模拟回调，非 Tauri 端到端。
- Runtime 历史证据：2026-09-10 的既有探针确认 codex-cli 0.153.4 注入 DeepSeek model_catalog_json 后只返回对应目录；本次未重跑远端 API 探针，不以 /models 成功推断对话可用。
- 最后更新：2026-09-10
