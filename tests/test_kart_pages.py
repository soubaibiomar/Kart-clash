"""GitHub Pages deployment: public files, relative modules and subpath hosting."""
import functools
import importlib.util
import json
from pathlib import Path
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading
import unittest
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('pages_builder', ROOT / 'kart/build-frontend.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PagesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        builder.build(ROOT)
        cls.public = ROOT / 'dist/kart-clash'

    def test_public_manifest_excludes_training_and_private_data(self):
        manifest = json.loads((self.public / 'build.json').read_text(encoding='utf-8'))
        files = manifest['files']
        self.assertIn('kart/app.js', files)
        self.assertIn('kart/entities/BoostPad.js', files)
        for name in files:
            self.assertFalse(name.startswith(('gp/training/', 'gp/models/', 'kart/academy/')))
            self.assertFalse(any(part in name.split('/') for part in ['.git', '.venv', 'runs']))
            self.assertFalse(name.endswith(('.py', '.cjs', '.mp4', '.env')))

    def test_html_and_module_dependencies_are_relative_and_present(self):
        html = (self.public / 'index.html').read_text(encoding='utf-8')
        references = re.findall(r'(?:src|href)=[\"\']([^\"\']+)[\"\']', html)
        for ref in references:
            if ref.startswith(('http:', 'https:', '#', 'data:')):
                continue
            self.assertFalse(ref.startswith('/'), ref)
            self.assertTrue((self.public / ref).is_file(), ref)
        for file in (self.public / 'kart').glob('*.js'):
            text = file.read_text(encoding='utf-8')
            imports = re.findall(r'(?:from\s*|import\s*)[\"\'](\.[^\"\']+)[\"\']', text)
            for ref in imports:
                target = (file.parent / ref).resolve()
                self.assertTrue(target.is_relative_to(self.public.resolve()), ref)
                self.assertTrue(target.is_file(), str(file.relative_to(self.public)) + ': ' + ref)

    def test_package_serves_below_a_repository_subpath(self):
        # The generated folder name differs from GitHub's repository casing, but
        # nested URL resolution uses the same project-site path structure.
        class QuietHandler(SimpleHTTPRequestHandler):
            def log_message(self, *args):
                pass
        handler = functools.partial(QuietHandler, directory=str(self.public.parent))
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = f'http://127.0.0.1:{server.server_port}/kart-clash/'
            for name in ['index.html', 'vehicle.js', 'libraries/p5.min.js', 'gp/vendor/three.module.js', 'kart/app.js', 'kart/race-selection.js']:
                with urlopen(base + name, timeout=5) as response:
                    self.assertEqual(response.status, 200)
                    self.assertGreater(len(response.read()), 0)
            with urlopen(base + 'build.json', timeout=5) as response:
                self.assertIn('id', json.load(response))
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)


if __name__ == '__main__':
    unittest.main()
