import json,subprocess,unittest,threading,urllib.request,urllib.error,tempfile
from pathlib import Path
import torch
from train import validate,forward,export,run
import server
from unittest.mock import patch

ROOT=Path(__file__).resolve().parent
def options():return {'name':'isolated fixture','config':{'sensors':5,'range':150,'hidden':[4,5],'activation':'tanh'},'population':4,'generations':1,'epochs':0,'steps':120,'minutes':1,'seed':123}

class AcademyTests(unittest.TestCase):
    def test_validation_ranges_and_topology(self):
        self.assertEqual(validate(options())['config']['hidden'],[4,5])
        for key,value in [('population',3),('generations',0),('epochs',-1),('steps',0),('seed',True),('minutes',61)]:
            o=options();o[key]=value
            with self.assertRaises(ValueError):validate(o)
        for key,value in [('sensors',4),('hidden',[]),('hidden',[65]),('activation','sigmoid'),('range',float('nan'))]:
            o=options();o['config'][key]=value
            with self.assertRaises(ValueError):validate(o)

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_cuda_forward_export_matches_browser_inference_for_both_activations(self):
        # Forward-only synthetic fixtures: no optimizer, no job, no model files.
        for activation in ['tanh','relu']:
            o=options();o['config']['activation']=activation;torch.manual_seed(41)
            layers=[(torch.randn(a,b,device='cuda')*.08,torch.randn(b,device='cuda')*.02) for a,b in [(26,4),(4,5),(5,4)]]
            x=torch.linspace(-1,1,26,device='cuda').reshape(1,26);expected=forward(x,layers,activation).detach().cpu()[0].tolist();m=export(layers,o)
            script="const g=require('./kart/node-world.cjs').load();let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const d=JSON.parse(s);process.stdout.write(JSON.stringify(new g.CombatBrain(d.model).predict(d.input)));});"
            result=subprocess.run(['node','-e',script],input=json.dumps({'model':m,'input':x.cpu()[0].tolist()}),text=True,capture_output=True,cwd=ROOT.parents[1],check=True);actual=json.loads(result.stdout)
            for a,b in zip(expected,actual):self.assertAlmostEqual(a,b,places=5)

    def test_exact_shared_rollout_is_seeded_and_produces_genuine_demonstrations(self):
        request={'options':{'demos':True,'config':options()['config'],'seed':123,'steps':120,'layout':1}}
        def run():return json.loads(subprocess.run(['node',str(ROOT/'evaluate.cjs')],input=json.dumps(request),text=True,capture_output=True,check=True).stdout)
        a,b=run(),run();self.assertEqual(a,b);self.assertEqual(a['preview']['tick'],120);self.assertTrue(a['samples']);self.assertEqual(len(a['samples'][0]['input']),26);self.assertEqual(len(a['samples'][0]['action']),4);self.assertTrue(all(-1<=v<=1 for s in a['samples'] for v in s['input']))

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_isolated_one_epoch_one_generation_pipeline_and_pre_requested_stop(self):
        # Deliberately tiny disposable fixture, never the user's Academy runs/models.
        with tempfile.TemporaryDirectory(prefix='kart-fixture-') as directory:
            path=Path(directory)/'config.json';o=options();o['epochs']=1;path.write_text(json.dumps(o));run(path)
            status=json.loads((path.parent/'status.json').read_text());brain=json.loads((path.parent/'brain.json').read_text());self.assertEqual(status['phase'],'complete');self.assertEqual(len(status['history']),1);self.assertEqual(brain['schema'],'kart-combat-v2');self.assertEqual(brain['metadata']['generation'],1);self.assertFalse(status['passed']);self.assertEqual(status['preview']['tick'],120);self.assertEqual(len(status['population']),4);self.assertEqual(status['brainRevision'],1);self.assertEqual(len(status['baseline']),3);self.assertEqual(len(status['scenarios']),3);self.assertEqual(brain['metadata']['baseline'],status['baseline']);self.assertTrue(all('collisionRate' in row and 'distance' in row for row in status['baseline']))
        with tempfile.TemporaryDirectory(prefix='kart-stop-fixture-') as directory:
            path=Path(directory)/'config.json';path.write_text(json.dumps(options()));(path.parent/'stop').touch();run(path);status=json.loads((path.parent/'status.json').read_text());self.assertEqual(status['phase'],'stopped');self.assertEqual(status['history'],[])

    def test_service_read_only_endpoints_never_launch_jobs_and_reject_foreign_origins(self):
        http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start();base='http://127.0.0.1:'+str(http.server_port)
        try:
            with urllib.request.urlopen(base+'/api/status') as response:self.assertEqual(json.load(response)['phase'],'idle')
            with urllib.request.urlopen(base+'/api/device') as response:
                device=json.load(response);self.assertTrue(device['trainingView']);self.assertTrue(device['adaptivePace'])
            self.assertIsNone(server.JOB)
            req=urllib.request.Request(base+'/api/start',data=b'{}',headers={'Content-Type':'application/json'})
            with self.assertRaises(urllib.error.HTTPError) as err:urllib.request.urlopen(req)
            self.assertEqual(err.exception.code,400);self.assertIsNone(server.JOB)
            req=urllib.request.Request(base+'/api/status',headers={'Origin':'https://example.com'})
            with self.assertRaises(urllib.error.HTTPError) as err:urllib.request.urlopen(req)
            self.assertEqual(err.exception.code,403)
            with self.assertRaises(urllib.error.HTTPError) as err:urllib.request.urlopen(base+'/api/brain?id=../private')
            self.assertEqual(err.exception.code,404)
        finally:http.shutdown();http.server_close();thread.join()

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_start_stop_contract_with_mocked_worker_never_launches_training(self):
        old_root,old_job,old_current=server.ROOT,server.JOB,server.CURRENT
        with tempfile.TemporaryDirectory(prefix='kart-api-fixture-') as directory:
            server.ROOT=Path(directory);server.JOB=None;server.CURRENT=None
            http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start();base='http://127.0.0.1:'+str(http.server_port)
            try:
                with patch.object(server.subprocess,'Popen') as launch:
                    launch.return_value.poll.return_value=None
                    def post(path,data):
                        request=urllib.request.Request(base+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json','Origin':'http://127.0.0.1:8870'})
                        with urllib.request.urlopen(request) as response:return json.load(response)
                    result=post('/api/start',options());self.assertEqual(launch.call_count,1);self.assertEqual(json.loads((server.CURRENT/'config.json').read_text()),options())
                    with urllib.request.urlopen(base+'/api/status') as response:self.assertEqual(json.load(response)['phase'],'starting')
                    post('/api/stop',{});self.assertTrue((server.CURRENT/'stop').exists())
                    with self.assertRaises(urllib.error.HTTPError) as error:post('/api/start',options())
                    self.assertEqual(error.exception.code,409);error.exception.close()
            finally:http.shutdown();http.server_close();thread.join();server.ROOT,server.JOB,server.CURRENT=old_root,old_job,old_current

if __name__=='__main__':unittest.main()
