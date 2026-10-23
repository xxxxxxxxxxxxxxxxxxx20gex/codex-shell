# 测试与发布状态

- 模块职责：维护质量门禁、Runtime 兼容验证、Windows 发布证据及未覆盖边界；模块行为由对应状态文档维护，历史由 Git 保留。
- 当前状态：公开版本为 v0.1.13，使用 Core 0.160.1 和既有 Updater minisign 公钥；main 的 Soft Notebook、品牌／小狗动画及任务栏修复仅进入源码／Debug。客户端检查更新后下载、验签并安装，不展示更新正文。Windows Authenticode 尚未配置，SmartScreen 仍可能提示未知发布者。
- 当前接口：`pnpm test:quality` 执行 TypeScript、ESLint、Vitest、高德离线测试、production build、Knip、Cargo check、Rust 单测、严格 Clippy 和 diff 检查。专项入口见 [测试脚本说明](../../tests/scripts/README.md)。
- 已知问题：缺少 CI、Windows Authenticode、超长活动虚拟化和三栏拖拽端到端覆盖；`test:extension-layout` 指向缺失文件，技能和 MCP 应分别使用 Soft Notebook、MCP 专项。Vite 主 chunk 超过 500 kB；Rust 既有格式差异尚未整理，`cargo fmt --check` 未纳入门禁。生图 `--mask` 未接通上传，不得据参数存在宣称遮罩编辑可用。
- 下一步：真实系统凭据、多渠道对话、第三方 MCP OAuth、干净 Windows 安装升级、大型历史迁移，以及生图编辑／遮罩契约补齐后的专项验证。
- 最后更新：2026-10-23

## 当前验证基线

- 2026-10-23，文档复核期间在任务栏修复后的代码基线执行 `pnpm test:quality` 通过：78 个文件／487 项前端、34 项高德离线、52 项 Rust 测试通过，1 项交互测试忽略；TypeScript、ESLint、Knip、production build、Cargo check、严格 Clippy 和 diff 检查通过。保留 Vite 大 chunk 提示。
- 2026-10-23，文档对齐后的 `pnpm desktop:build` 通过，包含 production build；Debug Runtime 及三个 helper 的 SHA-256 与暂存 manifest 一致。更新的四份 image-gen 说明与 Debug 随包资源逐项哈希一致；11 项 `test_tuzi_skill.py` 离线测试通过，未调用真实服务。Rust 链接器信息提示保留。
- 2026-10-23，复核全部 39 份跟踪 Markdown 的职责与引用；本地链接、标题锚点、文档中的 pnpm 命令名称，以及发布分支与 tag 的提交一致性分别检查。有效入口不等于已运行专项；已知失效的 extension 探针单独保留为问题。
- 以下为当前实现仍有效的最近专项证据，各行日期独立，不意味着本次文档整理重新执行了全部浏览器、Runtime 或在线服务验收。旧版本和被替代的验证流水由 Git 保留。

## 专项覆盖与边界

| 范围 | 最近证据 | 已验证与限制 |
| --- | --- | --- |
| Windows 任务栏图标 | 2026-10-23，`check-window-icon.ps1` | 旧 Debug 复现缺少 `ICON_BIG`；修复后真实窗口小图标存在，大图标按实际 DPI 尺寸与 EXE 资源逐像素一致。Windows PowerShell 5／7 通过，150% DPI 为 48×48，真实任务栏截图正确；未验证固定快捷方式缓存或干净安装。 |
| 主题与共用界面 | 2026-10-23，`test:soft-notebook-layout` | 四尺寸技能、详情、斜杠菜单、个性化／外观／运行环境／诊断、空状态和 Portal；深浅对比度、系统实时切换、焦点、Escape／外部点击、文字下限通过。使用真实子组件与模拟数据，不挂载完整 App 或 Runtime；模型渠道由专用探针覆盖。 |
| 小狗 SVG | 2026-10-23，Soft Notebook 与独立 SVG 浏览器检查 | 深浅主题、两种 motion 偏好均播放，布局稳定；1.6 秒周期首尾截图一致。保留参考形象与有意线条断口；未实现原视频逐帧抬爪，未验收真实 WebView2 长期性能。 |
| 工作台与侧栏 | 2026-10-23，`test:workbench-layout` 与定向配色检查 | 四尺寸标题 hover、截断、列边缘、菜单焦点／关闭；新建对话浅色、深色及系统暗色的静止／hover 计算颜色、尺寸和键盘焦点通过。工作台探针为真实子组件加布局夹具；其 reduced-motion 覆盖为截图，不代表所有菜单交互都完整。 |
| Composer 与导航 | 2026-10-23 Composer；2026-10-20 timeline 联合探针 | 四尺寸拖拽增高、范围、键盘与 Escape、提示、队列、输入边界和 reduced-motion；联合探针扣除左右栏宽度，320px 输入下导航可点击、滚动轨道固定、最新回复避让且历史阅读锚点保留。未覆盖完整 WebView2。 |
| 提问、代码与资源 | 2026-10-23 提问／代码探针；2026-10-20 附件／链接 | 四尺寸深浅主题、自由输入、只读／锁定、焦点、代码长行／换行／复制、蓝色链接及附件布局通过；问答 ID 关联、历史确认和乐观输入排除有单测。文件／剪贴板回调为模拟，未验收 Excel 粘贴或完整桌面文件打开。 |
| 渠道与 MCP | 2026-10-23 四尺寸专用探针 | 列表／编辑／删除、输入、焦点、模态边界通过；配置冲突、凭据失败、重载失败、卸载保留、迟到响应和模型参数校准有回归。未写真实系统凭据或连接真实第三方 MCP 服务。 |
| 草图与终端 | 2026-10-23 草图；2026-10-08 终端探针 | 四尺寸及既有草图 150% DPI、曲线、单击、擦除、撤销／重做和画布比例检查；终端折叠、键盘、字号与边界通过。未验收真实 WebView2 手写触控。 |
| 历史排序与 Steer | 2026-10-20 排序；2026-10-14 Steer | 排序的持久化、分组、存储失败／上限、指针／键盘、取消和边缘滚动有单测与四尺寸证据；真实 Core＋本机模拟网关确认 steer 客户端 ID 经事件与历史回传。未使用收费模型。 |
| Runtime 与历史迁移 | 2026-10-07 兼容门禁；2026-10-12 问答／连续侧聊探针 | Core 0.160.1 的 875 个生成文件和当时 101 处调用／订阅门禁通过；原生设置／队列、Goal、分页、回退替换、普通／临时分叉、冷恢复及 legacy CLI／后台迁移通过。使用隔离 CODEX_HOME 与本机模拟 Responses 网关；未验证真实大型旧库或任意旧安装包直接升级。 |
| 内置 Skill | 2026-10-23 项目文档 Skill；2026-10-05 生图预览 | 项目文档 Skill 格式、八条原则、三个 Debug 资源哈希及 3 项 Rust 资源测试通过；生图预览 14 项 Python 测试覆盖缩放、透明背景、EXIF、防覆盖和非法输入。生图 Images 编辑路由及 `--mask` 未上传的问题于 2026-10-23 静态确认；不视为真实编辑验收。 |

## 未覆盖范围

- 真实 Windows Credential Manager 故障注入、第三方 MCP OAuth、多渠道收费模型对话、生图／高德 API 账号权限和配额。
- 干净机器安装升级、真实网络在线更新、跨实体显示器、完整 WebView2 手写触控／编辑链路和长期动画性能。
- 真实大型旧库迁移、忙文件／损坏历史恢复、网关安全缓冲／重路由、超长 Diff／活动性能。
- 图片／PDF 仍由 app-server 完整返回后判断预览大小，尚无源端分段读取；第三方网关工具图片续答问题不能宣称由内核升级解决。
- Images 编辑、多参考图和遮罩语义未完成真实服务验收；当前遮罩参数没有进入请求，不能使用它宣称局部编辑成功。

## 最近发布

公开版本为 [v0.1.13](https://github.com/xxxxxxxxxxxxxxxxxxx20gex/codex-shell/releases/tag/v0.1.13)，发布提交日期为 2026-10-20；`release/v0.1.13` 与解引用后的 `v0.1.13` tag 均指向 `811003e`。发布资产为 `codex-shell_0.1.13_x64-setup.exe`、同名 `.sig` 和 `latest.json`，使用 Core 0.160.1，Updater 公钥保持不变。

2026-10-23 只读复跑 `pnpm release:verify release-artifacts/v0.1.13` 通过：安装器 minisign 签名、可信注释签名、manifest 版本／签名／下载文件名，以及本机 release Runtime／三个 helper 哈希均正确。安装器 SHA-256 为 `9428b1fb7c0094f35ace92cd374253095808f716c64fe0615dea1b9b9a40df60`。该命令未重新生成或上传资产，也不代替远端下载、干净安装或在线升级验收。

公开版本发布时的完整质量与资源区四尺寸证据仍有效；其后 main 的视觉、插画、任务栏和 Skill 文档更新不属于该冻结安装器。升级前关闭 CS 并备份独立 CODEX_HOME，旧安装器不能还原被新版 Core 迁移的数据。历史版本资产与详细验证过程由 Git 和对应 Release 保留。
