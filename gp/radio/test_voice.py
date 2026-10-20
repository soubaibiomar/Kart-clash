import base64
import io
import json
import os
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import wave
from http.server import ThreadingHTTPServer
import voice_server as voice


class VoiceTests(unittest.TestCase):
    def test_validation_and_free_text_stay_data(self):
        text = 'Box; $(not-a-command) <speak>plain text</speak>'
        self.assertEqual(voice.validate({'text': text, 'language': 'en-GB'}), (text, 'en-GB'))
        for data in [None, {}, {'text': '', 'language': 'en-GB'}, {'text': 'x'*401, 'language': 'en-GB'}, {'text': 'ok', 'language': 'xx'}]:
            with self.assertRaises(ValueError): voice.validate(data)

    @unittest.skipUnless(os.name == 'nt', 'Windows installed voices')
    def test_real_windows_voice_produces_pcm_without_speaker_output(self):
        result = voice.synthesize({'text': 'Radio check. Loud and clear.', 'language': 'en-GB'})
        audio = base64.b64decode(result['audio'])
        with wave.open(io.BytesIO(audio)) as wav:
            self.assertGreater(wav.getnframes()/wav.getframerate(), .5)
            self.assertLess(wav.getnframes()/wav.getframerate(), 10)
            self.assertGreater(wav.getframerate(), 8000)
            self.assertEqual(wav.getsampwidth(), 2)
            self.assertNotEqual(set(wav.readframes(wav.getnframes())), {0})

    def test_http_origin_validation_cache_and_no_training_routes(self):
        voice.CACHE.clear()
        server = ThreadingHTTPServer(('127.0.0.1', 0), voice.Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        url = f'http://127.0.0.1:{server.server_port}'
        def post(path, data, origin='http://127.0.0.1:8765'):
            return urlopen(Request(url+path, json.dumps(data).encode(), {'Content-Type':'application/json','Origin':origin}), timeout=5)
        try:
            with patch.object(voice, 'synthesize', return_value={'audio':base64.b64encode(b'RIFF-test-audio').decode()}) as synth:
                for _ in range(2):
                    with post('/voice', {'text':'Copy.', 'language':'en-GB'}) as response:
                        self.assertEqual(response.headers['Content-Type'], 'audio/wav')
                        self.assertEqual(response.headers['Access-Control-Allow-Origin'], 'http://127.0.0.1:8765')
                self.assertEqual(synth.call_count, 1)
                for path, data, origin, code in [('/api/train', {}, 'http://127.0.0.1:8765', 404),('/voice', {}, 'http://127.0.0.1:8765',400),('/voice',{},'https://example.com',403)]:
                    with self.assertRaises(HTTPError) as caught: post(path,data,origin)
                    self.assertEqual(caught.exception.code,code);caught.exception.close()
        finally:
            server.shutdown();server.server_close();thread.join()


if __name__ == '__main__': unittest.main()
