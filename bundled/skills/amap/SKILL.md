---
name: amap
description: 通过脚本直连高德 Web Service API 完成地理编码、逆地理编码、IP 定位、天气、路径规划、距离测量和 POI 查询。用户要求“高德/AMap 查询”“路线规划”“地理编码”“POI 搜索”或需要用命令行脚本调用高德 API 时使用。
---

# 高德地图

## 使用前提
需要 PATH 中可用的 Bun 和高德 Web 服务类型的 API Key，脚本只从 `AMAP_MAPS_API_KEY` 环境变量读取密钥。CS 不内置 Bun，也不使用对话渠道的 API Key。缺少依赖或密钥时说明缺项，不输出密钥，不把密钥写入 Skill、项目配置或命令日志。用户在 Windows 用户环境变量中设置后，重启 CS 以继承新配置。

在本技能目录执行 `bun scripts/amap.ts --help`；从其他工作目录调用时使用当前 Skill 所在目录解析脚本绝对路径，不写死用户名或安装位置。

## Workflow
1. Validate user intent and select one command.
2. Prefer address commands for route planning when users provide plain addresses.
3. Keep output as raw AMap JSON without wrapping fields.
4. 按接口判断成功：v3 的 `status` 为 `"1"`，v4 的 `errcode` 为 `0`；其他业务状态按失败处理，不编造查询结果。

## Commands
- Full command mapping: `references/command-map.md`
- Ready-to-run examples: `references/examples.md`

## Notes
- This skill is script-first and does not run an MCP server.
- Only `AMAP_MAPS_API_KEY` is supported.
