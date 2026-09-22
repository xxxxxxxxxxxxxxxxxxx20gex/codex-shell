"""Render a data-driven travel poster over an AMap static map; no image generation."""
import argparse
import io
import json
import math
import os
from functools import lru_cache
from pathlib import Path
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFont


def world(location, zoom):
    lon, lat = map(float, location)
    if not (-180 <= lon <= 180 and -85 <= lat <= 85):
        raise ValueError('Invalid longitude/latitude')
    n = 256 * 2 ** zoom
    return n * (lon + 180) / 360, n * (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2


def load_base(spec, root):
    path = root / spec['image']
    metadata = path.with_suffix(path.suffix + '.json')
    identity = {field: spec[field] for field in ('center', 'zoom', 'size', 'scale')}
    if path.exists():
        if not metadata.exists():
            raise ValueError('Map cache has no parameter record; choose a new map.image path to download a verified cache')
        if json.loads(metadata.read_text(encoding='utf-8')) != identity:
            raise ValueError('Map cache parameters differ; choose a new map.image path')
    if not path.exists():
        key = os.environ.get('AMAP_MAPS_API_KEY')
        if not key:
            raise ValueError('Missing AMAP_MAPS_API_KEY; provide it in the process environment')
        params = {'key': key, 'location': ','.join(map(str, spec['center'])),
                  'zoom': spec['zoom'], 'size': '*'.join(map(str, spec['size'])), 'scale': spec['scale']}
        try:
            with urllib.request.urlopen('https://restapi.amap.com/v3/staticmap?' + urllib.parse.urlencode(params), timeout=45) as response:
                raw = response.read()
                content_type = response.headers.get('Content-Type', '')
        except Exception:
            # Network exceptions can contain the authenticated URL. Never expose it.
            raise RuntimeError('Static map request failed; check network and Web Service permissions') from None
        if 'image' not in content_type:
            raise RuntimeError('Static map returned an API error; no image saved')
        image = Image.open(io.BytesIO(raw)).convert('RGB')
        expected = tuple(int(x * spec['scale']) for x in spec['size'])
        if image.size != expected:
            raise ValueError(f'Base image dimensions {image.size} != configured {expected}')
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path)
        metadata.write_text(json.dumps(identity), encoding='utf-8')
    image = Image.open(path).convert('RGB')
    expected = tuple(int(x * spec['scale']) for x in spec['size'])
    if image.size != expected:
        raise ValueError(f'Base image dimensions {image.size} != configured {expected}; do not guess projection')
    return image


def route_line(draw, points, mode, color):
    if mode == 'metro':
        draw.line(points, fill='white', width=12)
        draw.line(points, fill=color, width=7)
        return
    period, on = {'walk': (14, 5), 'bike': (26, 17), 'bus': (38, 28), 'schematic': (32, 16)}[mode]
    distance = 0
    for a, b in zip(points, points[1:]):
        length = math.dist(a, b)
        count = max(1, math.ceil(length / 2))
        for i in range(count):
            t, u = i / count, (i + 1) / count
            if (distance + length * t) % period < on:
                segment = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t,
                           a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
                draw.line(segment, fill='white', width=10)
                draw.line(segment, fill=color, width=6)
        distance += length


def render(config, output):
    root = config.parent
    cfg = json.loads(config.read_text(encoding='utf-8'))
    if cfg.get('coordinate_system') != 'GCJ-02':
        raise ValueError('Only verified GCJ-02 coordinates may be overlaid on this AMap base')
    if cfg.get('version') != 1:
        raise ValueError('Unsupported template version')
    for suffix in ('.png', '.pdf', '.preview.png', '.json'):
        if output.with_suffix(suffix).exists():
            raise ValueError('Output exists; choose a new --out prefix')
    spec = cfg['map']
    if spec['size'][0] != spec['size'][1]:
        raise ValueError('This poster template requires a square base map')
    base = load_base(spec, root)
    candidates = [cfg.get('font'), 'C:/Windows/Fonts/msyh.ttc',
                  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']
    font_path = next((str(root / p) for p in candidates if p and (root / p).exists()), None)
    if not font_path:
        raise ValueError('Set font to an installed font with Chinese glyphs')
    @lru_cache(maxsize=16)
    def font(n):
        return ImageFont.truetype(font_path, n)
    w, h = 3360, 2860
    image = Image.new('RGB', (w, h), '#fafcfb')
    draw = ImageDraw.Draw(image)
    def text(x, y, value, size=28, color='#243a37'):
        draw.text((x, y), value, fill=color, font=font(size))
    def wrap(x, y, value, width, size=28, color='#243a37'):
        line = ''
        for ch in value:
            if ch == '\n' or draw.textlength(line + ch, font=font(size)) > width:
                text(x, y, line, size, color)
                y += size + 12
                line = '' if ch == '\n' else ch
            else:
                line += ch
        if line:
            text(x, y, line, size, color)
            y += size + 12
        return y
    text(65, 36, cfg['title'], 72)
    text(65, 138, cfg['subtitle'], 32)
    draw.rectangle((65, 210, 3295, 330), fill='#e7f0eb')
    if wrap(88, 228, cfg['lodging'], 3175, 30) > 328:
        raise ValueError('Lodging text overflows; shorten it')
    mx, my, side = 65, 375, 2048
    image.paste(base.resize((side, side), Image.Resampling.LANCZOS), (mx, my))
    # Explicit calibration is stored in config; never infer zoom from PNG dimensions alone.
    zoom = spec['zoom'] + spec['zoom_offset']
    cx, cy = world(spec['center'], zoom)
    scale = side / spec['size'][0]
    def pos(location):
        px, py = world(location, zoom)
        x, y = mx + side/2 + (px-cx)*scale, my + side/2 + (py-cy)*scale
        if not (mx+3 <= x <= mx+side-3 and my+3 <= y <= my+side-3):
            raise ValueError('Point or route outside map bounds; widen map or filter detail routes')
        return x, y
    geometry = json.loads((root / cfg['geometry']).read_text(encoding='utf-8'))
    counts = {}
    for route in geometry['routes']:
        mode = route['mode']
        if mode not in ('metro', 'walk', 'bike', 'bus', 'schematic'):
            raise ValueError('Unsupported route mode: ' + mode)
        if mode == 'schematic' and not route.get('note'):
            raise ValueError('Schematic routes require an explicit uncertainty note')
        points = [pos(p) for p in route['points']]
        if len(points) < 2:
            continue
        counts[mode] = counts.get(mode, 0) + 1
        color = route['color']
        route_line(draw, points, mode, color)
    boxes = []
    for point in cfg['points']:
        x, y = pos(point['location'])
        lx, ly = point['label_xy']
        lx, ly = mx + lx, my + ly
        tw = draw.textlength(point['label'], font=font(28)) + 28
        box = (lx, ly, lx+tw, ly+53)
        if not (mx <= lx and my <= ly and box[2] <= mx+side and box[3] <= my+side-35):
            raise ValueError('Label outside safe map area: ' + point['label'])
        if any(box[0] < b[2] and box[2] > b[0] and box[1] < b[3] and box[3] > b[1] for b in boxes):
            raise ValueError('Overlapping label boxes: ' + point['label'])
        boxes.append(box)
        color = point.get('color', '#245642')
        draw.line((x, y, lx+tw/2, ly+26), fill=color, width=3)
        draw.rounded_rectangle(box, radius=8, fill='white', outline=color, width=2)
        text(lx+14, ly+7, point['label'], 28, color)
        draw.ellipse((x-22, y-22, x+22, y+22), fill=color, outline='white', width=3)
        draw.text((x, y), point['id'], font=font(23), fill='white', anchor='mm')
    sy = 375
    for section in cfg['sections']:
        draw.rectangle((2170, sy, 3295, sy+61), fill=section['color'])
        text(2190, sy+9, section['title'], 32, 'white')
        sy += 80
        for item in section['items']:
            sy = wrap(2180, sy, item['time'], 1100, 29, section['color'])
            sy = wrap(2180, sy, item['text'], 1100, 27) + 17
        sy += 18
    if sy > 2640:
        raise ValueError('Timeline overflows; shorten text or split into overview/detail posters')
    names = {'metro': '地铁', 'bus': '公交', 'walk': '步行', 'bike': '骑行', 'schematic': '示意'}
    for i, mode in enumerate(mode for mode in names if mode in counts):
        x = 65 + i * 400
        route_line(draw, [(x, 2479), (x + 110, 2479)], mode, '#245642')
        text(x + 126, 2460, names[mode], 29)
    ly = wrap(65, 2520, cfg['legend'], 2048, 29)
    ly = wrap(65, ly+16, cfg['notes'], 2048, 27)
    if ly > 2670:
        raise ValueError('Legend/notes overflow')
    for i, value in enumerate(cfg['footer']):
        text(65, 2715+i*42, value, 25)
    if len(cfg['footer']) > 3:
        raise ValueError('Footer supports at most three lines')
    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output.with_suffix('.png'))
    image.save(output.with_suffix('.pdf'), 'PDF', resolution=200)
    preview = image.copy()
    preview.thumbnail((1680, 1430))
    preview.save(output.with_suffix('.preview.png'))
    record = {'config': cfg, 'geometry': geometry, 'actual_base_size': base.size,
              'output_size': image.size, 'segments_by_mode': counts, 'timeline_bottom': sy}
    output.with_suffix('.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    return counts


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True, help='New output prefix, without extension')
    args = parser.parse_args()
    try:
        print(json.dumps({'status': 'ok', 'segments': render(args.config.resolve(), args.out.resolve())}))
    except (ValueError, KeyError, OSError, RuntimeError) as error:
        parser.exit(2, str(error) + '\n')
