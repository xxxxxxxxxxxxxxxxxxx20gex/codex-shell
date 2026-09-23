import base64
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import httpx
from PIL import Image


script = Path(__file__).resolve().parents[2] / "bundled/skills/image-gen/scripts/image_gen.py"
spec = importlib.util.spec_from_file_location("tuzi_image_gen", script)
skill = importlib.util.module_from_spec(spec)
spec.loader.exec_module(skill)
CONNECTION = {
    "TUZI_API_KEY": "test-image-key",
    "TUZI_BASE_URL": "https://images.example.test/v1/",
}


class TuziSkillTests(unittest.TestCase):
    def setUp(self):
        self.registry = MagicMock()
        self.registry.QueryValueEx.side_effect = FileNotFoundError
        registry_patch = patch.dict(sys.modules, {"winreg": self.registry})
        registry_patch.start()
        self.addCleanup(registry_patch.stop)

    def test_default_url_requires_only_key(self):
        with patch.dict(os.environ, {"TUZI_API_KEY": "test-image-key"}, clear=True):
            self.assertEqual(skill.load_connection(), ("test-image-key", "https://api.tu-zi.com/v1"))

    def test_windows_environment_precedence_and_empty_fallback(self):
        for process, user, system, expected in (
            ("process", "user", "system", "process"),
            ("", "user", "system", "user"),
            (" ", " ", "system", "system"),
            ("", None, "system", "system"),
            ("", None, None, ""),
        ):
            def query(handle, name):
                value = user if handle == self.registry.HKEY_CURRENT_USER else system
                if value is None:
                    raise FileNotFoundError
                return value, self.registry.REG_SZ

            self.registry.OpenKey.side_effect = lambda hive, path: unittest.mock.MagicMock(__enter__=lambda _: hive)
            self.registry.QueryValueEx.side_effect = query
            with self.subTest(expected=expected), patch.dict(os.environ, {"TUZI_API_KEY": process}, clear=True), patch.object(sys, "platform", "win32"):
                self.assertEqual(skill.read_environment("TUZI_API_KEY"), expected)

    def test_registry_error_is_not_reported_as_missing(self):
        self.registry.QueryValueEx.side_effect = PermissionError
        with patch.dict(os.environ, {}, clear=True), patch.object(sys, "platform", "win32"):
            with self.assertRaisesRegex(ValueError, "读取权限"):
                skill.load_connection()

    def test_system_url_and_key_are_loaded_without_process_values(self):
        self.registry.OpenKey.side_effect = lambda hive, path: MagicMock(__enter__=lambda _: hive)

        def query(handle, name):
            if handle == self.registry.HKEY_CURRENT_USER:
                raise FileNotFoundError
            return CONNECTION[name], self.registry.REG_SZ

        self.registry.QueryValueEx.side_effect = query
        with patch.dict(os.environ, {}, clear=True), patch.object(sys, "platform", "win32"):
            self.assertEqual(skill.load_connection(), ("test-image-key", "https://images.example.test/v1"))

    def test_request_failure_redacts_registry_key_and_never_retries(self):
        requests = []

        def respond(request):
            requests.append(request)
            raise RuntimeError("transport echoed registry-test-key")

        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "result.png"
            client = httpx.Client(transport=httpx.MockTransport(respond))
            with patch.object(skill, "read_environment", side_effect=lambda name: "registry-test-key" if name == "TUZI_API_KEY" else ""), \
                    patch.object(sys, "argv", [str(script), "--prompt", "test", "--out", str(output)]), \
                    patch.object(skill.httpx, "Client", return_value=client):
                with self.assertRaises(ValueError) as error:
                    skill.main()
            self.assertNotIn("registry-test-key", str(error.exception))
            self.assertNotIn("registry-test-key", output.with_suffix(".json").read_text(encoding="utf-8"))
            self.assertFalse(output.exists())
            self.assertEqual(len(requests), 1)

    def test_endpoint_error_is_distinct_and_redacted(self):
        response = httpx.Response(400, text='wrong_endpoint_for_model test-image-key')
        with self.assertRaisesRegex(ValueError, "不是环境变量缺失") as error:
            skill.check_response(response, "test-image-key")
        self.assertNotIn("test-image-key", str(error.exception))

    def test_connection_uses_only_paired_image_variables(self):
        with patch.dict(os.environ, {**CONNECTION, "OPENAI_API_KEY": "chat-key"}, clear=True):
            self.assertEqual(skill.load_connection(), ("test-image-key", "https://images.example.test/v1"))

    def test_missing_pair_never_reads_legacy_credentials(self):
        for values in ({}, {"CODEX_SHELL_IMAGE_API_KEY": "old-key", "CODEX_SHELL_IMAGE_BASE_URL": "https://old.example.test/v1", "OPENAI_API_KEY": "chat-key"},
                       {"TUZI_BASE_URL": "https://images.example.test/v1"}):
            with self.subTest(values=list(values)), patch.dict(os.environ, values, clear=True), \
                    patch.object(Path, "open", side_effect=AssertionError("must not read credential files")):
                with self.assertRaisesRegex(ValueError, "TUZI_API_KEY.*TUZI_BASE_URL"):
                    skill.load_connection()

    def test_rejects_unsafe_base_urls_without_echoing_them(self):
        for url in ("http://images.example.test/v1", "https://user:secret@example.test/v1",
                    "https://example.test/v1?key=secret", "https://example.test/v1#secret", "not-a-url"):
            with self.subTest(url=url), patch.dict(os.environ, {**CONNECTION, "TUZI_BASE_URL": url}, clear=True):
                with self.assertRaises(ValueError) as error:
                    skill.load_connection()
                self.assertNotIn("secret", str(error.exception))

    def test_requests_preserve_model_route_and_do_not_send_key_to_cdn(self):
        png = io.BytesIO()
        Image.new("RGB", (2, 2)).save(png, format="PNG")
        for options, model, route in (([], "gpt-image-2.5", "/v1/chat/completions"),
                                     (["--model", "user-choice", "--api", "images"], "user-choice", "/v1/images/generations")):
            requests = []

            def respond(request):
                requests.append(request)
                if request.method == "GET":
                    self.assertNotIn("authorization", request.headers)
                    return httpx.Response(200, content=png.getvalue())
                self.assertEqual(request.url.host, "images.example.test")
                self.assertEqual(request.url.path, route)
                self.assertEqual(request.headers["authorization"], "Bearer test-image-key")
                payload = json.loads(request.content)
                self.assertEqual(payload["model"], model)
                prompt = payload["messages"][0]["content"][0]["text"] if route.endswith("completions") else payload["prompt"]
                self.assertEqual(prompt, "test")
                if route.endswith("completions"):
                    return httpx.Response(200, json={"choices": [{"message": {"content": "![image](https://cdn.example.test/image.png)"}, "finish_reason": "stop"}]})
                return httpx.Response(200, json={"data": [{"b64_json": base64.b64encode(png.getvalue()).decode()}]})

            with self.subTest(model=model), tempfile.TemporaryDirectory() as directory:
                output = Path(directory) / "result.png"
                client = httpx.Client(transport=httpx.MockTransport(respond))
                with patch.dict(os.environ, CONNECTION, clear=True), \
                        patch.object(sys, "argv", [str(script), "--prompt", "test", "--out", str(output), *options]), \
                        patch.object(skill.httpx, "Client", return_value=client), patch("sys.stdout", new=io.StringIO()):
                    skill.main()
                self.assertTrue(output.is_file())
                record = output.with_suffix(".json").read_text(encoding="utf-8")
                self.assertNotIn("test-image-key", record)
                self.assertEqual(json.loads(record)["status"], "succeeded")
                self.assertEqual(sum(r.method == "POST" for r in requests), 1)

    def test_missing_config_does_not_send_request_or_create_output(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "result.png"
            with patch.dict(os.environ, {}, clear=True), \
                    patch.object(sys, "argv", [str(script), "--prompt", "test", "--out", str(output)]), \
                    patch.object(skill.httpx, "Client", side_effect=AssertionError("must not send request")):
                with self.assertRaises(ValueError):
                    skill.main()
            self.assertEqual(list(Path(directory).iterdir()), [])


if __name__ == "__main__":
    unittest.main()
