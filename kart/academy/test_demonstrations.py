import json,subprocess,tempfile,unittest,copy
from pathlib import Path
import torch
import threading,urllib.request
from unittest.mock import patch
import server
from train import run
from demonstrations import validate_demo,split_samples
from test_academy import options,ROOT

def recorded():
    script="const g=require('./kart/node-world.cjs').load();const w=new g.KartWorld({bots:0});w.phase='playing';w.recorder=new g.KartDemonstration(w);w.playerAction={turn:.2,throttle:.8,fire:false,drift:true};for(let i=0;i<240;i++)w.step();process.stdout.write(JSON.stringify(w.recorder.stop()));"
    return json.loads(subprocess.run(['node','-e',script],cwd=ROOT.parents[1],text=True,capture_output=True,check=True).stdout)

class DemonstrationTests(unittest.TestCase):
    def test_explicit_evaluation_runs_six_equal_scenarios_without_training_or_storage(self):
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        try:
            with patch.object(server,'invoke',return_value={'metrics':{'fitness':1}}) as evaluate,patch.object(server.subprocess,'Popen') as worker:
                request=urllib.request.Request('http://127.0.0.1:'+str(http.server_port)+'/api/evaluate',data=json.dumps({'model':{},'steps':120,'seed':22}).encode(),headers={'Content-Type':'application/json'})
                with urllib.request.urlopen(request) as response:result=json.load(response)
                self.assertEqual(evaluate.call_count,6);worker.assert_not_called();self.assertEqual(len(result['scenarios']),3)
                calls=evaluate.call_args_list
                for i in [0,2,4]:self.assertEqual(calls[i].args[0]['options'],calls[i+1].args[0]['options'])
        finally:http.shutdown();http.server_close();thread.join()

    def test_browser_dataset_matches_backend_and_has_separated_holdout(self):
        d=recorded();validate_demo(d,d['config']);a,b=split_samples(d['samples']);self.assertTrue(a and b);self.assertGreaterEqual(b[0]['tick']-a[-1]['tick'],60)
        for key in ['simulation','modelSchema','actionSchema','observationSchema']:
            bad=copy.deepcopy(d);bad[key]='old'
            with self.assertRaises(ValueError):validate_demo(bad,d['config'])
        bad=copy.deepcopy(d);bad['samples'][1]['tick']=bad['samples'][0]['tick']
        with self.assertRaises(ValueError):validate_demo(bad,d['config'])
        bad=copy.deepcopy(d);bad['samples'][0]['input'][0]=float('nan')
        with self.assertRaises(ValueError):validate_demo(bad,d['config'])

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_recorded_player_data_reaches_cuda_imitation_and_export(self):
        with tempfile.TemporaryDirectory(prefix='kart-player-fixture-') as directory:
            d=recorded();o=options();o['config']=d['config'];o['config']['hidden']=[4];o['epochs']=1;o['demonstration']=d
            path=Path(directory)/'config.json';path.write_text(json.dumps(o));run(path)
            status=json.loads((path.parent/'status.json').read_text());brain=json.loads((path.parent/'brain.json').read_text())
            self.assertEqual(status['phase'],'complete');self.assertEqual(brain['metadata']['imitation']['source'],'player');self.assertGreater(brain['metadata']['imitation']['validationSamples'],0);self.assertEqual(len(brain['layers'][-1]['b']),4);self.assertEqual(brain['metadata']['simulation'],'rival-v3')

if __name__=='__main__':unittest.main()
