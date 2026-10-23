# 文生图与参考图协议

核对日期：2026-09-11。来源：[渠道配置](https://api.tu-zi.com/api/pricing)、[Chat 文档](https://tuzi-api.apifox.cn/343647063e0.md)与实际调用。

以下地址以兔子为例；脚本按已配置的 API 根地址拼接接口路径，配置方法见 [首次配置](cli.md#首次配置)。

## Chat

POST https://api.tu-zi.com/v1/chat/completions，Bearer 鉴权，JSON：

```json
{
  "model": "gpt-image-2.5",
  "stream": false,
  "messages": [{"role": "user", "content": [
    {"type": "text", "text": "根据草图布局生成真人摄影图片"},
    {"type": "image_url", "image_url": {"url": "data:image/png;base64,<实际图片编码>"}}
  ]}]
}
```

纯文生图不传 image_url，提示词直接描述完整场景。
实测 choices[0].message.content 返回单个 Markdown 图片链接。脚本下载后验证并保存 PNG；纯文字或未知格式明确报错。
gpt-image-2.5 与 gpt-image-2.5-vip 自动使用该协议。Chat 尺寸/质量参数未核实，脚本拒绝 --size、--quality。多参考图未实测。

## Images 文生图

POST /v1/images/generations，JSON 参数 model、prompt、size、quality、n=1。
gpt-image-2 已实测。支持 data[0].url 和 data[0].b64_json，保存真实尺寸，不自动缩放。

## Images 参考图编辑

脚本已实现 `POST /v1/images/edits`：使用 `multipart/form-data` 上传参考图及 model、prompt、size、quality、n 字段。单图字段为 `image`，多图字段为 `image[]`；多图和编辑型号的真实服务效果尚未验收。

自动路由以 `scripts/image_gen.py` 中的型号集合为准：Chat 型号使用 `/chat/completions`；Images 编辑型号无参考图时使用 generations、有图时使用 edits；只登记 Images 文生图的型号（例如 `gpt-image-2.5-flare`）在有参考图时拒绝调用。未知型号要求显式选择经核实的协议，不自动探测或切换。

当前 `--mask` 仅被解析并记录路径，未加入 multipart 请求，遮罩局部编辑暂不可用。不得以参数存在或 JSON 中有 mask 路径宣称遮罩已生效。

## 网络与结果

API 不自动跳转、不自动重试。CDN 下载不带密钥。
可通过 HTTPS_PROXY=http://127.0.0.1:7897 使用本机代理，但不保证解决网络问题。
超时或下载失败记录为 failed_or_unknown，不能据此认为未计费。
当前只解析已经验证的响应结构，不保证未知渠道变体都兼容。

## 渠道 Apifox 图片接口依据

兔子官方兼容格式文档明确列出两个独立接口：

- `POST /v1/images/generations`：创建图像（文生图），请求体为 JSON，文档示例包含 `model`、`prompt`、`size` 等字段。
- `POST /v1/images/edits`：编辑图片（图生图），请求类型为 `multipart/form-data`，文档示例使用 `model`、`prompt` 和上传图片字段。

文档页面：
- [创建图像（文生图）](https://tuzi-api.apifox.cn/448333992e0)
- [编辑图片（图生图）](https://tuzi-api.apifox.cn/448333922e0)

以上为渠道接口文档依据。2026-10-23 对照仓库脚本确认 generations 和 edits 请求路径均已实现；这次只做静态复核，未调用收费服务。文档示例中的模型和字段不能自动推广到 `gpt-image-2.5` 或 `gpt-image-2.5-vip`；真实型号、权限、返回结构、尺寸和质量支持需在用户授权的任务中单独验证。
