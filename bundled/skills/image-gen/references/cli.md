# 命令行说明

从技能根目录（SKILL.md 所在目录）执行，其他位置使用脚本绝对路径。

```powershell
python -m pip install -r ./scripts/requirements.txt
python ./scripts/image_gen.py --model gpt-image-2.5 --prompt-file ./prompt.txt --out ./results/text.png
python ./scripts/image_gen.py --model gpt-image-2.5 --image ./reference.png --prompt-file ./prompt.txt --out ./results/reference.png
```

--prompt 与 --prompt-file 必选其一。--image 读取实际本地图片。--api 默认 auto，gpt-image-2.5 和 gpt-image-2.5-vip 自动选择 Chat。多图未实测。
Chat 不接受 --size 或 --quality。Images 文生图可使用，默认 1024x1024 和 low。
脚本默认型号仍为 gpt-image-2，参考图工作流显式指定 gpt-image-2.5。
--timeout 默认 300 秒，是网络操作超时，不是严格的总耗时上限。
--out 必须是新 PNG 路径，同名 JSON 也不能存在。不自动重试，不自动替换模型。

## Windows 环境与可移动路径

本文件参考个人 imagegen 的 CLI 文档，所有示例已改为当前兔子脚本语法。建议激活 Python 3.11+ 的 conda 环境后运行。

```powershell
$imageScript = 'D:/23262/image-gen/scripts/image_gen.py'
$common = @('--model', 'gpt-image-2.5')
python $imageScript @common --prompt-file ./scene.txt --out ./results/scene.png
python $imageScript @common --image ./sketch.png --prompt-file ./reference-prompt.txt --out ./results/sketch-render.png
```

路径移动后修改 imageScript 即可。插件内则从 skills/image-gen/SKILL.md 所在目录解析脚本。
用户级环境变量更新后，新启动的终端和 Codex 才会继承；当前 PowerShell 的 $env: 设置只作用于该进程及子进程。脚本不自动加载 .env。
凭据使用 TUZI_API_KEY 或本机凭据库，不能照抄源文档中的 OPENAI_API_KEY、OPENAI_BASE_URL。

## 多张图片与文件命名

不同用途使用不同提示词文件和输出名，例如 product-kv1.png、product-scene.png。
同一主题的变体使用 product-kv1-v2.png 等新文件名，不覆盖原稿。
本脚本一次生成一张；没有 generate、generate-batch 子命令，也没有 --n、--concurrency、--force、--dry-run、--out-dir、--downscale-max-dim。
多张任务按已授权数量逐张调用，失败后不要自动重发。不从源文档复制 JSONL 批量命令。

## Images 文生图参数

```powershell
python $imageScript --model gpt-image-2 --size 1024x1024 --quality low --prompt-file ./product.txt --out ./results/product.png
```

low 可用于草稿；medium/high/auto 可在用户需要时指定，但本渠道实测范围见 image-api.md。不要把其他文档的 auto/medium 默认值套用到本脚本。
场景、风格、构图和约束都是提示词内容，不是 --style、--composition 等 CLI 参数。

## 保存与检查

输出 PNG 和同名 JSON，JSON 保存参数、提示词、输入路径、实际尺寸、耗时和可用的 usage。
保留原始生成图；若后续确需压缩或缩放，另存衍生文件并检查尺寸，不把缩放结果当作模型原生分辨率。
交付时给出图片路径，按用户要求提供提示词；不要向图片 CDN 发送密钥。网络问题见 [网络排查](codex-network.md)。
