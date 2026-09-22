---
name: amap
description: 通过脚本直连高德 Web Service API 完成地理编码、逆地理编码、IP 定位、天气、路径规划、距离测量和 POI 查询。用户要求“高德/AMap 查询”“路线规划”“地理编码”“POI 搜索”或需要用命令行脚本调用高德 API 时使用。
---

# 高德地图

## 使用前提
需要 PATH 中可用的 Bun 和高德 Web 服务类型的 API Key，脚本只从 `AMAP_MAPS_API_KEY` 环境变量读取密钥。CS 不内置 Bun，也不使用对话渠道的 API Key。缺少依赖或密钥时说明缺项，不输出密钥，不把密钥写入 Skill、项目配置或命令日志。用户在 Windows 用户环境变量中设置后，重启 CS 以继承新配置。

在本技能目录执行 `bun scripts/amap.ts --help`；从其他工作目录调用时使用当前 Skill 所在目录解析脚本绝对路径，不写死用户名或安装位置。

## 查询与规划
- 用户提供明确地址时可使用地址路线命令，并传入已知城市。起点或终点地理编码返回多个候选时，脚本退出码为 `6`，stderr 标明歧义端点，stdout 保留原始候选 JSON。此时未请求路线，不能把候选响应中的 `status="1"` 当成路线成功。
- 根据候选的完整地址、城市、区县和坐标核对上下文；不能唯一确定时向用户确认。确认后用候选坐标调用对应的 `*-route-coords`，或补充城市和详细地址后重试。不要默认取第一个候选。即使仅返回一个结果，也要检查 `level`；省、市、区县等粗粒度匹配不等于准确门店地址。
- 驾车的 `--waypoints` 接受最多 16 个有序坐标点；用户给出途经点名称时先用 `geocode` 或 POI 搜索确定位置，逐个消歧后按用户顺序传入。不会自动优化途经点顺序。路线偏好使用 `--strategy`，数值含义见 [命令说明](references/command-map.md)；“避免收费”不保证道路通行费为零。
- 关键词和周边搜索支持 `--page`、`--offset`，一次调用只查询一页。需要更多结果时保持查询条件及每页条数不变再翻页；空页、短页、已满足需求或达到同一查询最多 200 条的窗口时停止。不要承诺全量商家采集，也不要拆分查询来绕过限制。
- 脚本保留原始高德 JSON。结合退出码与接口状态判断结果：v3 的 `status` 为 `"1"`，v4 的 `errcode` 为 `0`；失败时不编造查询结果。

## Commands
- Full command mapping: `references/command-map.md`
- Ready-to-run examples: `references/examples.md`

## Notes
- This skill is script-first and does not run an MCP server.
- Only `AMAP_MAPS_API_KEY` is supported.
