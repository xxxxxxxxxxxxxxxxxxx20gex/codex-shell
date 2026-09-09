# 凭据安全状态

- 模块职责：在 Windows Credential Manager 中维护用户 API Key，并只向授权的 app-server 子进程注入。
- 当前状态：主 API Key 与 MCP HTTP Token 写入接口已接入；MCP 凭据按 CODEX_HOME 隔离，app-server 启动时注入 CS 专用环境变量，前端不能回读。
- 最近变更：HTTP Token 使用密码输入 DOM 提交后清空，不进入 React state、日志或配置；配置只保存 bearer_token_env_var 引用。stdio 使用系统环境变量引用。
- 当前接口：save_api_key、save_mcp_secret（支持删除）；read_api_key 与 MCP read_environment 仅后端启动模块调用。
- 安全边界：Key 不进入项目源码、普通设置、命令行参数或状态文档；第三方 provider 通过 `env_key=OPENAI_API_KEY` 在子进程内读取，不创建明文 `auth.json`。
- 已知问题：更换或删除 Token 后需重启更新子进程环境。MCP 凭据集中保存在各 HOME 的 keyring 条目中，受系统容量限制；真实 Credential Manager 写入及第三方 OAuth 尚未人工验收。
- 下一步：增加“测试连接”UI、友好鉴权错误和多配置档案设计。
- 验证证据：2026-09-09；测试验证 Token 不进入 MCP config RPC，配置冲突不写凭据；Rust 16 项单测和 Clippy 通过。
- 相关决策：[ADR-002：隔离运行数据与凭据](../decisions/ADR-002-isolated-runtime-data.md)。
- 最后更新：2026-09-09
