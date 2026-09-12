# 模型与实测记录

渠道 https://api.tu-zi.com，核对日期 2026-09-11。
型号名称、vip 后缀不能证明上游身份、质量或价格。

| 型号 | 当前工作流 | 实测 |
| --- | --- | --- |
| gpt-image-2 | Images 文生图 | 成功，请求1024x1024，返回1254x1254，58.47秒 |
| gpt-image-2.5 | Chat 文生图 | 成功，1024x1536，65.52秒 |
| gpt-image-2.5 | Chat 单参考图生成 | 人像79.75秒；草图转沙发人像53.41秒，1811x868 |
| gpt-image-2.5-vip | Chat 单参考图生成 | 成功，1024x1536，90.67秒 |

以上耗时不是受控性能对比。真人效果、商品一致性仍需查看成图。

此前模型列表还包含 chatgpt-image-latest、gpt-image-1、gpt-image-1-vip、gpt-image-1.5、gpt-image-2-1k、gpt-image-2-count、gpt-image-2-exact、gpt-image-2-vip、gpt-image2、gpt-image-2.5-1k、gpt-image-2.5-flare、gpt-image-2.5-prism、gpt-image-2.5-sunburst。这些不作为本次验证通过的能力承诺。
具体调用见 [协议说明](protocols.md) 和 [CLI](cli.md)。

## 参数对照与来源边界

个人 imagegen 的 image-api.md 描述的是另一份 CLI 和 API 能力，不是兔子渠道逐型号的测试结果。下表用于防止混用。

| 概念 | 当前脚本处理 | 使用边界 |
| --- | --- | --- |
| prompt | 文本或 UTF-8 文件 | Chat 转为 messages 中的 text |
| model | 原样传入 | 自动路由基于已整理的型号集合，未知型号报错 |
| size | Images 文生图支持，默认1024x1024 | Chat拒绝此参数；实际像素需查看结果 |
| quality | Images 支持low/medium/high/auto，默认low | Chat不做推测性映射 |
| n | Images固定为1 | 不提供多张数量参数；Chat提示词也应要求一张 |
| 图片输入 | Chat image_url 中的真实文件Base64 | 单参考图已实测，多图未实测 |
| 返回编码 | Images URL/Base64；Chat单个Markdown图片链接 | 不保证能解析所有服务商变体 |
| output_format / compression | 未暴露 | 当前验证并保存PNG，不宣称支持JPEG/WebP参数 |
| background / moderation等 | 未暴露 | 源文档的参数不能直接作为当前脚本选项 |

源文件中的保真控制、遮罩、透明输出和批量配置不属于当前技能工作流，不迁入操作示例。普通PNG也不代表具有透明通道。

## 尺寸参考

源文档列举1024x1024、1536x1024、1024x1536、2048x2048、2048x1152、3840x2160、2160x3840、auto。
其中gpt-image-2的文档约束为最大边3840、边长为16的倍数、长宽比不超过3:1、像素数655360至8294400。
这是参考规则，不能据此保证当前渠道每种尺寸都能调用；不得套用到Chat或其他型号。源文档对高分辨率还标注实验性，本地没有做高分辨率验证。

较大尺寸、较高质量可能增加延迟或费用；方形与低质量作为草稿的建议不构成渠道速度承诺。
