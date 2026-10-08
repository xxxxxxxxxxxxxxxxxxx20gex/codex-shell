# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界；模块行为由对应状态文档维护，历史由 Git 保留。
- 当前状态：v0.1.10 使用官方 Core 0.160.1，沿用既有 Updater minisign 公钥。Windows Authenticode 尚未配置，SmartScreen 仍可能提示未知发布者。
- 当前接口：`pnpm test:quality` 执行 TypeScript、ESLint、Vitest、高德离线测试、production build、Knip、Cargo check、Rust 单测、严格 Clippy 和 diff 检查。专项入口见 [测试脚本说明](../../tests/scripts/README.md)。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；Vite 主 chunk 超过 500 kB；Rust 既有格式差异尚未整理，`cargo fmt --check` 未纳入门禁。
- 下一步：真实系统凭据、多渠道对话、第三方 MCP OAuth、干净 Windows 安装升级和大型历史迁移验收。
- 最后更新：2026-10-08

## 当前验证基线

2026-10-08，v0.1.10 版本配置下执行质量检查：73 个 Vitest 文件／405 项前端测试、34 项高德离线测试、51 项 Rust 单测（1 项交互测试忽略），以及 TypeScript、ESLint、production build、Knip、Cargo check、严格 Clippy 和 diff 检查通过。MCP 四尺寸 Edge 布局探针通过；MCP 表单收尾调整后定向组件测试与布局探针再次通过。Debug 重建及 Core 0.160.1 主程序／辅助程序哈希检查通过。

模型提示回归覆盖跨会话同文案隔离、切换会话可见性、长时间缓冲及解除、回合结束、可重试／终止错误、Thread 关闭和进程停止。Edge 四尺寸 Composer／提示检查通过。既有安全回归覆盖官方目录隔离、凭据失败补偿、MCP 环境变量保护、渠道 URL 和图片输入校验。

0.160.1 同源 Runtime 兼容门禁检查 875 个生成文件及 101 处调用／订阅；设置／队列、Goal、0.159.2 到 0.160.1 的隔离历史升级与迁移、内置 rg 探针已通过。分页、回退替换、分叉、临时侧聊发送和冷恢复均使用临时 CODEX_HOME 与本机模拟 Responses 网关，不接触真实用户数据或收费模型。旧 0.154 到 0.159.2 的迁移证据保留在历史提交中，不等同于本次直接从旧安装包升级的人工验收。

image-gen 最近专项证据为 2026-10-05 的 14 项 Python 测试，覆盖预览缩放、透明背景、EXIF、防覆盖和非法输入；未执行收费生图或真实网关视觉续答。草图既有专项验证覆盖四尺寸、150% DPI、曲线边缘、单击圆点、橡皮擦、撤销／重做和画布比例。模块细节见 [Runtime](runtime-status.md)、[协议](protocol-status.md)、[客户端](app-server-client-status.md) 和 [桌面 UI](ui-shell-status.md)。

## 未覆盖范围

- 真实 Windows Credential Manager 故障注入、第三方 MCP OAuth、生图／高德 API 的账号权限和配额。
- 干净机器安装升级、跨实体显示器、完整 WebView2 手写触控、超长 Diff／活动性能。
- 真实大型旧库迁移、真实网关安全缓冲／重路由、完整 WebView2 消息编辑链路。
- 图片／PDF 仍由 app-server 完整返回后判断预览大小，尚无源端分段读取；第三方网关工具图片续答问题不能宣称由内核升级解决。

## 最近发布

v0.1.10 使用 Core 0.160.1，发布资产为 NSIS 安装器、`.sig` 和 `latest.json`，入口为 [GitHub Release](https://github.com/xxxxxxxxxxxxxxxxxxx20gex/codex-shell/releases/tag/v0.1.10)。2026-10-08 本机生产打包及 Debug 构建通过；独立校验安装器 minisign 签名、可信注释签名、manifest 版本／下载地址、主 Runtime 和三个 helper 哈希通过，公钥与 v0.1.9 一致。Release 输出的内置 rg 探针通过；上传资产及精确校验和以 GitHub Release 为准。这不代表干净机器安装或真实用户数据升级已经验收。

从 v0.1.9 或更早版本升级前，关闭 CS 并备份独立 CODEX_HOME。新版 Core 会迁移 legacy 历史，降级安装包不能代替数据恢复。v0.1.9 的 tag、发布分支和资产保留不变。
