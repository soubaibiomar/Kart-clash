import json,tempfile,unittest,threading,urllib.request,urllib.error
import server
from pathlib import Path
from unittest.mock import patch
import torch
from pace import PaceCurriculum
from train import run,validate,atomic
from test_academy import options


class PaceTests(unittest.TestCase):
    def good(self):return [dict(laps=1,collisionRate=.035,idleSeconds=2) for _ in range(3)]
    def test_two_confirmations_and_final_clamp(self):
        p=PaceCurriculum(dict(start=2.64,maximum=3.14,step=.4))
        a=p.result(self.good());self.assertEqual(a['next'],2.64);self.assertIsNone(a['validated'])
        a=p.result(self.good());self.assertEqual(a['tested'],2.64);self.assertEqual(a['next'],3.04);self.assertEqual(a['validated'],2.64)
        p.result(self.good());a=p.result(self.good());self.assertEqual(a['next'],3.14);self.assertFalse(a['complete'])
        p.result(self.good());a=p.result(self.good());self.assertTrue(a['complete']);self.assertEqual(p.current,3.14)
    def test_failure_resets_streak_and_every_scenario_must_finish(self):
        for patch_value in [dict(laps=0),dict(collisionRate=.035001),dict(idleSeconds=2.001),dict(collisionRate=float('nan'))]:
            p=PaceCurriculum(dict(start=2,maximum=4));p.result(self.good());bad=self.good();bad[2].update(patch_value);r=p.result(bad);self.assertFalse(r['safe']);self.assertEqual(r['streak'],0);self.assertEqual(p.current,2);self.assertEqual(p.result(self.good())['next'],2)
        p=PaceCurriculum(dict(start=2,maximum=4));self.assertFalse(p.result(self.good()[:2])['safe'])
    def test_invalid_ranges_and_combat_rejection(self):
        for patch_value in [dict(start=True),dict(start=float('inf')),dict(maximum=9),dict(maximum=1.2),dict(step=0),dict(start=5)]:
            with self.assertRaises(ValueError):PaceCurriculum.validate((dict(start=2,maximum=4)|patch_value))
        o=options();o['pace']=dict(start=2,maximum=4)
        with self.assertRaises(ValueError):validate(o)
    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_tiny_cuda_fixture_publishes_actual_weights_and_does_not_promote_failed_lap(self):
        with tempfile.TemporaryDirectory(prefix='kart-live-fixture-') as directory:
            path=Path(directory)/'config.json';o=options();o.update(track=dict(schema='kart-track-v1',name='Temporary pace fixture',width=200,closed=True,points=[dict(x=300,y=300),dict(x=1200,y=300),dict(x=1200,y=1000),dict(x=300,y=1000)]),pace=dict(start=2.64,maximum=4),epochs=1);path.write_text(json.dumps(o));revisions=[]
            def record(path,data):
                if path.name=='status.json' and 'brainRevision' in data:revisions.append(data['brainRevision'])
                return atomic(path,data)
            with patch('train.atomic',side_effect=record):run(path)
            status=json.loads((path.parent/'status.json').read_text());brain=json.loads((path.parent/'brain.json').read_text())
            self.assertEqual(status['phase'],'complete');self.assertIn('initial',revisions);self.assertIn('imitation-1',revisions);self.assertEqual(brain['driving']['maxSpeed'],2.64);self.assertEqual(status['pace']['next'],2.64);self.assertFalse(status['passed']);self.assertEqual(brain['metadata']['fitnessVersion'],'track-laptime-v1')
            self.assertLessEqual(brain['metadata']['evaluation']['topSpeed'],158.4+1e-6)

    def test_evaluation_rejects_invalid_speed_profiles_without_running_worker(self):
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:
            with patch('server.invoke') as worker:
                for driving in [None,False,[],dict(schema='track-pace-v1',maxSpeed=99)]:
                    request=urllib.request.Request('http://127.0.0.1:'+str(http.server_port)+'/api/evaluate',data=json.dumps(dict(model=dict(driving=driving))).encode(),headers={'Content-Type':'application/json'})
                    with self.assertRaises(urllib.error.HTTPError) as error:urllib.request.urlopen(request)
                    self.assertEqual(error.exception.code,400);error.exception.close()
                worker.assert_not_called()
        finally:http.shutdown();http.server_close();thread.join()
