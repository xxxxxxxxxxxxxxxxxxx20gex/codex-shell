"""Generate one image from text or references through the Tuzi channel."""

import argparse
import base64
import io
import json
import os
import re
from pathlib import Path
import sys
import time
from contextlib import ExitStack

import httpx
from PIL import Image


IMAGE_EDIT_MODELS = {"gpt-image-1", "gpt-image-1-vip", "gpt-image-1.5", "gpt-image-2", "gpt-image-2-1k", "gpt-image-2.5-1k"}
IMAGE_GENERATE_MODELS = {"gpt-image-2-vip", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst"}
CHAT_MODELS = {"gpt-image-2.5", "gpt-image-2.5-vip", "chatgpt-image-latest", "gpt-image-2-count", "gpt-image-2-exact", "gpt-image-2.5-prism", "gpt-image2", "gpt-image-2-free"}


def image_item(result, api):
    if api == "chat":
        choices = result.get("choices", [])
        if len(choices) != 1 or choices[0].get("finish_reason") == "length":
            raise ValueError("Expected one complete Chat image response.")
        content = choices[0].get("message", {}).get("content")
        # The verified channel response is a single Markdown image, not arbitrary prose URLs.
        match = re.fullmatch(r"\s*!\[[^\]\r\n]*\]\((https://[^\s<>]+)\)\s*", content) if isinstance(content, str) else None
        if not match:
            raise ValueError("Chat returned no single supported Markdown image; no retry was sent.")
        return {"url": match.group(1)}
    items = result.get("data")
    if not isinstance(items, list) or len(items) != 1:
        raise ValueError("Expected exactly one image in response.data.")
    return items[0]


def load_connection():
    key = os.environ.get("TUZI_API_KEY", "").strip()
    base_url = os.environ.get("TUZI_BASE_URL", "").strip().rstrip("/")
    if not key or not base_url:
        raise ValueError("请在本机配置 TUZI_API_KEY 和 TUZI_BASE_URL（兔子 API 根地址通常为 https://api.tu-zi.com/v1），然后重启 CS。不要在对话中发送密钥。")
    try:
        url = httpx.URL(base_url)
    except httpx.InvalidURL:
        raise ValueError("TUZI_BASE_URL 不是有效的 HTTPS API 根地址。") from None
    if url.scheme != "https" or not url.host or url.userinfo or url.query or url.fragment:
        raise ValueError("TUZI_BASE_URL 必须是 HTTPS API 根地址，不能包含账号密码、查询参数或片段。")
    return key, base_url


def check_response(response, key):
    if response.is_error:
        # Provider error bodies can echo request data; redact before displaying.
        detail = response.text.replace(key, "[REDACTED]")[:1200]
        raise ValueError(f"HTTP {response.status_code}: {detail}")
    response.raise_for_status()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--prompt")
    source.add_argument("--prompt-file", type=Path)
    parser.add_argument("--image", type=Path, action="append", default=[], help="Repeat for multiple reference images.")
    parser.add_argument("--mask", type=Path, help="Images edit only: optional PNG mask defining the editable area.")
    parser.add_argument("--model", default="gpt-image-2.5")
    parser.add_argument("--api", choices=["auto", "images", "chat"], default="auto")
    parser.add_argument("--size", help="Images only; default 1024x1024")
    parser.add_argument("--quality", choices=["auto", "low", "medium", "high"], help="Images only; default low")
    parser.add_argument("--out", type=Path, required=True, help="New PNG output path; never overwritten.")
    parser.add_argument("--timeout", type=float, default=300)
    args = parser.parse_args()
    prompt = args.prompt if args.prompt is not None else args.prompt_file.read_text(encoding="utf-8-sig")
    if not prompt.strip():
        raise ValueError("Prompt must not be empty.")
    if args.timeout <= 0:
        raise ValueError("Timeout must be positive.")
    if args.out.suffix.lower() != ".png":
        raise ValueError("Output must use the .png extension.")
    record_path = args.out.with_suffix(".json")
    if args.out.exists() or record_path.exists():
        raise ValueError("Output image or record already exists; choose a new --out path.")
    api = args.api
    if api == "auto":
        if args.model in CHAT_MODELS:
            api = "chat"
        elif args.model in IMAGE_EDIT_MODELS or args.model in IMAGE_GENERATE_MODELS:
            if args.image and args.model not in IMAGE_EDIT_MODELS:
                raise ValueError("This model has no documented Images edit route. Verify its protocol before explicitly choosing --api.")
            api = "images"
        else:
            raise ValueError("Unknown model protocol; verify documentation and explicitly choose --api images or chat.")
    if api == "chat" and (args.size is not None or args.quality is not None):
        raise ValueError("Chat size/quality parameters are unverified. Omit --size/--quality; describe framing in the prompt (not an exact-size guarantee).")
    for path in args.image:
        with Image.open(path) as reference:
            reference.verify()
    key, base_url = load_connection()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    payload = {"model": args.model, "prompt": prompt, "size": args.size or "1024x1024", "quality": args.quality or "low", "n": 1}
    if api == "chat":
        content = [{"type": "text", "text": prompt}]
        for path in args.image:
            with Image.open(path) as reference:
                mime = Image.MIME[reference.format]
            content.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")}})
        payload = {"model": args.model, "stream": False, "messages": [{"role": "user", "content": content}]}
    endpoint = "/chat/completions" if api == "chat" else ("/images/edits" if args.image else "/images/generations")
    parameters = {"model": args.model, "stream": False, "prompt": prompt} if api == "chat" else payload
    record = {"endpoint": base_url + endpoint, "api": api, "parameters": parameters, "input_images": [str(p.resolve()) for p in args.image], "mask": str(args.mask.resolve()) if args.mask else None, "status": "started"}
    # Reserve the record before a potentially billable request; never retry POSTs.
    with record_path.open("x", encoding="utf-8") as handle:
        json.dump(record, handle, ensure_ascii=False, indent=2)
    started = time.monotonic()
    try:
        with httpx.Client(timeout=httpx.Timeout(args.timeout, connect=30), follow_redirects=False) as client, ExitStack() as stack:
            headers = {"Authorization": "Bearer " + key}
            if api == "images" and args.image:
                field = "image" if len(args.image) == 1 else "image[]"
                files = [(field, (p.name, stack.enter_context(p.open("rb")))) for p in args.image]
                response = client.post(base_url + endpoint, headers=headers, data={k: str(v) for k, v in payload.items()}, files=files)
            else:
                response = client.post(base_url + endpoint, headers=headers, json=payload)
            check_response(response, key)
            result = response.json()
            item = image_item(result, api)
            if item.get("b64_json"):
                image_bytes = base64.b64decode(item["b64_json"], validate=True)
                record["response_format"] = "b64_json"
            elif item.get("url"):
                url = httpx.URL(item["url"])
                if url.scheme != "https":
                    raise ValueError("Refusing a non-HTTPS image download URL.")
                # Download image assets without sending the API credential to the CDN.
                download = client.get(url, follow_redirects=True)
                check_response(download, key)
                image_bytes = download.content
                record["response_format"] = "url"
            else:
                raise ValueError("Image response contains neither b64_json nor url.")
            with Image.open(io.BytesIO(image_bytes)) as generated:
                generated.load()
                record["actual_size"] = list(generated.size)
                record["source_format"] = generated.format
                with args.out.open("xb") as handle:
                    generated.save(handle, format="PNG")
            record.update(status="succeeded", output=str(args.out.resolve()), usage=result.get("usage"), request_id=response.headers.get("x-request-id"))
    except Exception as error:
        record.update(status="failed_or_unknown", error=str(error).replace(key, "[REDACTED]"))
        raise
    finally:
        record["elapsed_seconds"] = round(time.monotonic() - started, 2)
        record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": record["status"], "image": record["output"], "size": record["actual_size"], "elapsed_seconds": record["elapsed_seconds"]}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        message = str(error)
        key = os.environ.get("TUZI_API_KEY", "").strip()
        if key:
            message = message.replace(key, "[REDACTED]")
        print(f"ERROR: {message}", file=sys.stderr)
        print("No automatic retry. If the request was sent, check provider billing before resubmitting.", file=sys.stderr)
        sys.exit(1)


