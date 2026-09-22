# Command Map

| Command | Endpoint | Required Flags | Optional Flags |
| --- | --- | --- | --- |
| `reverse-geocode` | `GET /v3/geocode/regeo` | `--location` | - |
| `geocode` | `GET /v3/geocode/geo` | `--address` | `--city` |
| `ip-location` | `GET /v3/ip` | `--ip` | - |
| `weather` | `GET /v3/weather/weatherInfo` | `--city` | `--extensions` (`base`/`all`) |
| `bike-route-coords` | `GET /v4/direction/bicycling` | `--origin`, `--destination` | - |
| `bike-route-address` | geocode x2 + bicycling | `--origin-address`, `--destination-address` | `--origin-city`, `--destination-city` |
| `walk-route-coords` | `GET /v3/direction/walking` | `--origin`, `--destination` | - |
| `walk-route-address` | geocode x2 + walking | `--origin-address`, `--destination-address` | `--origin-city`, `--destination-city` |
| `drive-route-coords` | `GET /v3/direction/driving` | `--origin`, `--destination` | `--strategy`, `--waypoints` |
| `drive-route-address` | geocode x2 + driving | `--origin-address`, `--destination-address` | `--origin-city`, `--destination-city`, `--strategy`, `--waypoints` |
| `transit-route-coords` | `GET /v3/direction/transit/integrated` | `--origin`, `--destination`, `--city`, `--cityd` | - |
| `transit-route-address` | geocode x2 + transit integrated | `--origin-address`, `--destination-address`, `--origin-city`, `--destination-city` | - |
| `distance` | `GET /v3/distance` | `--origins`, `--destination` | `--type` (`0`/`1`/`3`) |
| `poi-text` | `GET /v3/place/text` | `--keywords` | `--city`, `--citylimit` (`true`/`false`), `--page`, `--offset` |
| `poi-around` | `GET /v3/place/around` | `--location` | `--radius`, `--keywords`, `--page`, `--offset` |
| `poi-detail` | `GET /v3/place/detail` | `--id` | - |

## Exit Codes
- `0`: success
- `2`: input or config error
- `3`: network / timeout / HTTP transport error
- `4`: AMap business error
- `5`: unexpected internal error
- `6`: 地址有多个候选，需要消歧；stdout 为原始地理编码候选，stderr 标明起点或终点，无路线请求

## 驾车参数

- `--waypoints "经度,纬度;经度,纬度"`：1–16 个途经点，按输入顺序规划；经纬度最多 6 位小数。PowerShell 中必须给含分号的参数加引号。两个驾车命令均支持，其他交通方式不接受此参数。
- `--strategy`：整数 0–20，直接使用高德 v3 的策略编码。不传时保留接口默认值 0；0–9 为旧策略，建议新请求选择官方推荐的 10–20。不要套用路径规划 2.0 的编码。

| 值 | 路线偏好 |
| --- | --- |
| 10 | 综合推荐，接近高德默认规划 |
| 11 | 时间最短、距离最短、躲避拥堵多方案；官方建议优先使用 10 |
| 12 | 躲避拥堵 |
| 13 | 不走高速 |
| 14 | 避免收费，尽量选择低收费或免费道路 |
| 15 | 躲避拥堵＋不走高速 |
| 16 | 避免收费＋不走高速 |
| 17 | 躲避拥堵＋避免收费 |
| 18 | 躲避拥堵＋避免收费＋不走高速 |
| 19 | 高速优先 |
| 20 | 躲避拥堵＋高速优先 |

路线返回的 `tolls` 是道路通行费估计（元），与 API 调用计费无关，实际通行以道路收费为准。地址多候选时确认坐标后再调用坐标路线命令，途经点同样先确认。

## 地点搜索分页

`--page` 从 1 开始；`--offset` 为每页条数，本脚本按官方“强烈建议不超过 25”的说明限制为 1–25。不传时由接口使用 page=1、offset=20。相同查询最多支持获取 200 条；脚本拒绝起始位置超过这一窗口的页（例如 offset=25 时 page 最大为 8，offset=20 时最大为 10）。最后一页可以不足 offset 条，不自动请求后续页；总数 `count` 不代表可取回全量。

## 官方依据

2026-09-22 核对，当前脚本继续使用以下 v3 接口，不迁移路径规划 2.0：

- [驾车路径规划：strategy、waypoints](https://lbs.amap.com/api/webservice/guide/api/direction)
- [POI 搜索：page、offset 和 200 条限制](https://lbs.amap.com/api/webservice/guide/api/search)
- [地理编码：geocodes、location 和 level](https://lbs.amap.com/api/webservice/guide/api/georegeo)

## API Key
- Required env var: `AMAP_MAPS_API_KEY`
