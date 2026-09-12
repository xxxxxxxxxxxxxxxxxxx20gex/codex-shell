# 文生图与参考图协议

核对日期：2026-09-11。来源：[渠道配置](https://api.tu-zi.com/api/pricing)、[Chat 文档](https://tuzi-api.apifox.cn/343647063e0.md)与实际调用。

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

## 网络与结果

API 不自动跳转、不自动重试。CDN 下载不带密钥。
可通过 HTTPS_PROXY=http://127.0.0.1:7897 使用本机代理，但不保证解决网络问题。
超时或下载失败记录为 failed_or_unknown，不能据此认为未计费。
当前只解析已经验证的响应结构，不保证未知渠道变体都兼容。

## 官方 Apifox 图片接口（已核对文档，尚未纳入默认脚本）

兔子官方兼容格式文档明确列出两个独立接口：

- `POST /v1/images/generations`：创建图像（文生图），请求体为 JSON，文档示例包含 `model`、`prompt`、`size` 等字段。
- `POST /v1/images/edits`：编辑图片（图生图），请求类型为 `multipart/form-data`，文档示例使用 `model`、`prompt` 和上传图片字段。

文档页面：
- [创建图像（文生图）](https://tuzi-api.apifox.cn/448333992e0)
- [编辑图片（图生图）](https://tuzi-api.apifox.cn/448333922e0)

这说明兔子渠道在协议层提供独立编辑接口，之前“未验证”指的是当前插件脚本尚未针对该接口完成真实调用验证，而不是接口不存在。文档示例中的模型和字段不能自动推广到 `gpt-image-2.5` 或 `gpt-image-2.5-vip`；应先用低成本请求核对实际支持的模型、图片字段名、返回结构、尺寸和质量参数，再把通过验证的部分加入脚本。
