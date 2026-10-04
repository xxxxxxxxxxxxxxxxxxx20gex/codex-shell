import importlib.util
from pathlib import Path
import tempfile
import unittest

from PIL import Image

script = Path(__file__).resolve().parents[2] / "bundled/skills/image-gen/scripts/prepare_preview.py"
spec = importlib.util.spec_from_file_location("image_preview", script)
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewTests(unittest.TestCase):
    def test_resize_preserves_source_and_flattens_alpha(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.png"
            output = Path(directory) / "preview.jpg"
            Image.new("RGBA", (2048, 1024), (0, 0, 0, 0)).save(source)
            before = source.read_bytes()
            self.assertEqual(preview.prepare_preview(source, output), (1024, 512))
            self.assertEqual(source.read_bytes(), before)
            with Image.open(output) as image:
                self.assertEqual(image.format, "JPEG")
                self.assertEqual(image.getpixel((0, 0)), (255, 255, 255))
            saved = output.read_bytes()
            with self.assertRaises(FileExistsError):
                preview.prepare_preview(source, output)
            self.assertEqual(saved, output.read_bytes())

    def test_small_image_and_exif_orientation(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.jpg"
            exif = Image.Exif()
            exif[274] = 6
            Image.new("RGB", (40, 20), "red").save(source, exif=exif)
            self.assertEqual(preview.prepare_preview(source, Path(directory) / "preview.jpg"), (20, 40))
            with self.assertRaises(FileExistsError):
                preview.prepare_preview(source, source)

    def test_invalid_input_and_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "missing.png"
            output = Path(directory) / "preview.jpg"
            with self.assertRaises(FileNotFoundError):
                preview.prepare_preview(source, output)
            source.write_bytes(b"not an image")
            with self.assertRaises(OSError):
                preview.prepare_preview(source, output)
            self.assertFalse(output.exists())
            with self.assertRaises(ValueError):
                preview.prepare_preview(source, source)


if __name__ == "__main__":
    unittest.main()
