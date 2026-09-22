"""Offline travel-map regression checks; run with Python 3 and Pillow."""
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / 'bundled/skills/amap'
spec = importlib.util.spec_from_file_location('travel_map', SKILL / 'scripts/travel_map.py')
travel_map = importlib.util.module_from_spec(spec)
spec.loader.exec_module(travel_map)


class TravelMapTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.spec = {'image': 'base.png', 'center': [120.175, 30.274],
                     'zoom': 12, 'size': [32, 32], 'scale': 2}

    def download(self):
        raw = io.BytesIO()
        Image.new('RGB', (64, 64), '#cccccc').save(raw, 'PNG')
        raw.seek(0)
        raw.headers = {'Content-Type': 'image/png'}
        with patch.dict('os.environ', {'AMAP_MAPS_API_KEY': 'test-only'}), \
                patch.object(travel_map.urllib.request, 'urlopen', return_value=raw):
            return travel_map.load_base(self.spec, self.root)

    def test_download_and_offline_reuse(self):
        self.download()
        with patch.object(travel_map.urllib.request, 'urlopen', side_effect=AssertionError('network')):
            self.assertEqual(travel_map.load_base(self.spec, self.root).size, (64, 64))
        metadata = json.loads((self.root / 'base.png.json').read_text())
        self.assertNotIn('key', metadata)

    def test_changed_cache_parameters_rejected(self):
        self.download()
        for field, value in [('center', [121.9, 29.2]), ('zoom', 13),
                             ('size', [64, 64]), ('scale', 1)]:
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'parameters differ'):
                travel_map.load_base({**self.spec, field: value}, self.root)

    def test_legacy_cache_requires_new_path(self):
        Image.new('RGB', (64, 64)).save(self.root / 'base.png')
        with self.assertRaisesRegex(ValueError, 'no parameter record'):
            travel_map.load_base(self.spec, self.root)

    def test_api_failure_redacts_url_and_does_not_cache(self):
        with patch.dict('os.environ', {'AMAP_MAPS_API_KEY': 'test-secret'}), \
                patch.object(travel_map.urllib.request, 'urlopen', side_effect=OSError('URL?key=test-secret')):
            with self.assertRaises(RuntimeError) as error:
                travel_map.load_base(self.spec, self.root)
        self.assertNotIn('test-secret', str(error.exception))
        self.assertFalse((self.root / 'base.png').exists())

    def test_bus_and_walk_strokes_have_gaps_and_white_halo(self):
        for mode in ('bus', 'walk', 'bike', 'schematic', 'metro'):
            with self.subTest(mode=mode):
                image = Image.new('RGB', (160, 40), '#cccccc')
                travel_map.route_line(ImageDraw.Draw(image), [(10, 20), (150, 20)], mode, '#245642')
                colors = {image.getpixel((x, 20)) for x in range(10, 150)}
                self.assertIn((36, 86, 66), colors)
                if mode != 'metro':
                    self.assertIn((204, 204, 204), colors)
                self.assertIn((255, 255, 255), image.getdata())

    def test_sample_export_bus_and_no_overwrite(self):
        cfg = json.loads((SKILL / 'assets/travel-map/hangzhou-example.json').read_text(encoding='utf-8'))
        cfg['geometry'] = str(SKILL / 'assets/travel-map/hangzhou-geometry.json')
        geometry = json.loads(Path(cfg['geometry']).read_text(encoding='utf-8'))
        geometry['routes'][0]['mode'] = 'bus'
        (self.root / 'geometry.json').write_text(json.dumps(geometry), encoding='utf-8')
        cfg['geometry'] = 'geometry.json'
        plan = self.root / 'plan.json'
        plan.write_text(json.dumps(cfg, ensure_ascii=False), encoding='utf-8')
        with patch.object(travel_map, 'load_base', return_value=Image.new('RGB', (2048, 2048), '#eeeeee')):
            result = travel_map.render(plan, self.root / 'result')
            self.assertEqual(result['bus'], 1)
            for suffix in ('.png', '.pdf', '.preview.png', '.json'):
                self.assertTrue((self.root / ('result' + suffix)).is_file())
            with self.assertRaisesRegex(ValueError, 'Output exists'):
                travel_map.render(plan, self.root / 'result')


if __name__ == '__main__':
    unittest.main()
