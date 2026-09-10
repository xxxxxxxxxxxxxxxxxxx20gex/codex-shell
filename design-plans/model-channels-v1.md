# 模型渠道后续目标

厂商分组、渠道独立参数、内置 DeepSeek 目录和单渠道切换已经进入实现，当前事实以 [模型配置状态](../docs/status/model-config-status.md) 为准；决策理由见 [ADR-004](../docs/decisions/ADR-004-model-provider-channels.md)。已完成的 v1 过程、旧单 Provider 现状与过期接口草案由 Git 保留，不再作为当前开发说明。

## 未实施范围

- 文件模型目录：目前明确拒绝 catalog.file。未来接入前必须定义路径解析、目录格式校验与真实 Runtime 兼容验证，不仅增加输入框。
- 导入导出：密钥不得进入普通导出文件，导入必须处理渠道 ID 冲突及独立数据目录边界。
- 可选最小对话探测：与现有 /models 探针区分，执行前明确会产生模型用量。
- 并行多 Provider、渠道级代理、自动故障转移不属于已实现的单 app-server 架构。

这些目标尚未排期，不构成已完成能力或运行时契约。
