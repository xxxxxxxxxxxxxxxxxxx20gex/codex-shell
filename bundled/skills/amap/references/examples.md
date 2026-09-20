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
