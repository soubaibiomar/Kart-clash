"""Local Windows voice generation, independent of CUDA training. No microphone capture."""
import base64
from collections import OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import threading

ROOT = Path(__file__).resolve().parent
CACHE = OrderedDict()
LOCK = threading.Lock()
ORIGINS = {'http://127.0.0.1:8765', 'http://localhost:8765'}


def validate(data):
    if not isinstance(data, dict): raise ValueError('JSON object required')
    text, language = data.get('text'), data.get('language')
    if not isinstance(text, str) or not 1 <= len(text.strip()) <= 400: raise ValueError('Text must have 1–400 characters')
    if language not in ('fr-FR', 'en-GB'): raise ValueError('Unsupported language')
    return text.strip(), language


def synthesize(data):
    result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-File', str(ROOT / 'voice.ps1')],
                            input=json.dumps(data, ensure_ascii=False), text=True, encoding='utf-8',
                            capture_output=True, timeout=15, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    if result.returncode: raise RuntimeError('Windows voice unavailable for this language')
    return json.loads(result.stdout)


class Handler(BaseHTTPRequestHandler):
    def allowed(self):
        return self.headers.get('Host', '').split(':')[0] in ('127.0.0.1', 'localhost') and self.headers.get('Origin') in ORIGINS | {None}

    def respond(self, body, status=200, content_type='application/json'):
        if not isinstance(body, bytes): body = json.dumps(body).encode()
        self.send_response(status)
        origin = self.headers.get('Origin')
        if origin in ORIGINS: self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Vary', 'Origin')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Type', content_type)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        try: self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError): pass

    def do_OPTIONS(self):
        if not self.allowed(): return self.respond({'error': 'Local access only'}, 403)
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin', 'http://127.0.0.1:8765'))
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if not self.allowed(): return self.respond({'error': 'Local access only'}, 403)
        if self.path != '/health': return self.respond({'error': 'Unknown operation'}, 404)
        try: return self.respond(synthesize({'catalog': True}))
        except (RuntimeError, ValueError, OSError, subprocess.TimeoutExpired): return self.respond({'error': 'Windows voice unavailable'}, 503)

    def do_POST(self):
        if not self.allowed(): return self.respond({'error': 'Local access only'}, 403)
        if self.path != '/voice': return self.respond({'error': 'Unknown operation'}, 404)
        if self.headers.get('Content-Type') != 'application/json': return self.respond({'error': 'JSON required'}, 415)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096: raise ValueError('Invalid request size')
            text, language = validate(json.loads(self.rfile.read(length)))
        except (ValueError, TypeError): return self.respond({'error': 'Invalid voice request'}, 400)
        if not LOCK.acquire(blocking=False): return self.respond({'error': 'Voice channel busy'}, 503)
        try:
            key = (text, language)
            if key not in CACHE:
                result = synthesize({'text': text, 'language': language})
                audio = base64.b64decode(result['audio'], validate=True)
                if not audio.startswith(b'RIFF') or len(audio) > 4_000_000: raise RuntimeError('Invalid audio')
                CACHE[key] = audio
                if len(CACHE) > 32: CACHE.popitem(last=False)
            CACHE.move_to_end(key)
            return self.respond(CACHE[key], content_type='audio/wav')
        except (RuntimeError, ValueError, KeyError, OSError, subprocess.TimeoutExpired): return self.respond({'error': 'Local voice unavailable'}, 503)
        finally: LOCK.release()


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
