"""Create a local, non-destructive JPEG preview without calling an API."""

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def prepare_preview(source: Path, output: Path) -> tuple[int, int]:
    if output.suffix.lower() not in {".jpg", ".jpeg"}:
        raise ValueError("Preview output must be .jpg or .jpeg")
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original)
        image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        rgba = image.convert("RGBA")
        preview = Image.new("RGB", rgba.size, "white")
        preview.paste(rgba, mask=rgba.getchannel("A"))
        # Exclusive creation also prevents overwriting the source or a prior preview.
        with output.open("xb") as destination:
            preview.save(destination, format="JPEG", quality=80, optimize=True)
        return preview.size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    try:
        width, height = prepare_preview(args.source, args.out)
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        parser.exit(1, f"Preview failed: {error}\n")
    print(f"Preview: {args.out.resolve()} ({width}x{height})")


if __name__ == "__main__":
    main()
