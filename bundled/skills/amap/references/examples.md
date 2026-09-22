# Windows PowerShell 示例

先在 Windows 用户环境变量中配置 `AMAP_MAPS_API_KEY`，重启 CS 后使用。以下命令在 Skill 目录执行，不在命令行中传递密钥。

```powershell
bun scripts/amap.ts geocode --address "北京市朝阳区阜通东大街6号" --city 北京
bun scripts/amap.ts reverse-geocode --location 116.481488,39.990464
bun scripts/amap.ts bike-route-address --origin-address "北京市朝阳区阜通东大街6号" --destination-address "北京市海淀区上地十街10号" --origin-city 北京 --destination-city 北京
bun scripts/amap.ts transit-route-coords --origin 116.481488,39.990464 --destination 116.315613,39.998935 --city 北京 --cityd 北京
bun scripts/amap.ts poi-text --keywords "咖啡" --city 110108 --citylimit true
bun scripts/amap.ts distance --origins "116.481488,39.990464|116.434307,39.90909" --destination 116.315613,39.998935 --type 1
```

驾车经两个已确认的途经点，并尽量避免道路收费：

```powershell
bun scripts/amap.ts drive-route-address --origin-address "北京市朝阳区阜通东大街6号" --destination-address "北京市海淀区上地十街10号" --origin-city 北京 --destination-city 北京 --waypoints "116.434307,39.90909;116.397428,39.90923" --strategy 14
```

出现退出码 6 时，先阅读 stderr 判断是起点还是终点有歧义，核对 stdout 的候选城市、区县和完整地址。向用户确认后，用实际选中候选的坐标规划；以下坐标仅演示格式，不代表应当选择哪个候选：

```powershell
bun scripts/amap.ts geocode --address "同名大厦" --city 北京
bun scripts/amap.ts drive-route-coords --origin 116.481488,39.990464 --destination 116.315613,39.998935 --strategy 16
```

搜索海淀区咖啡店的第二页，及指定坐标周边的第二页；每页 25 条，同一查询最多查询到第 8 页：

```powershell
bun scripts/amap.ts poi-text --keywords "咖啡" --city 110108 --citylimit true --page 2 --offset 25
bun scripts/amap.ts poi-around --location 116.481488,39.990464 --radius 2000 --keywords "咖啡" --page 2 --offset 25
```

只在需要更多结果时翻页，保持其他查询参数与 offset 不变，空页或短页即停止；不得将分页结果称为全量商家名单。
