import json,subprocess,tempfile,unittest
from pathlib import Path
import torch
from evolution_train import validate,forward,probabilities,reproduce,export,run

ROOT=Path(__file__).resolve().parent
def options():return dict(algorithm='track-evolution-v1',name='Temporary evolution fixture',population=4,generations=2,steps=120,stagnation=30,seed=7,minutes=1,mutationRate=.1,mutationStrength=.3,speed=4.8,simulationSpeed=20,config=dict(sensors=6,range=220,hidden=[12],activation='tanh'),track=dict(schema='kart-track-v2',name='Temporary circuit fixture',width=160,closed=False,points=[dict(x=300,y=300,elevation=0,kind='road'),dict(x=800,y=300,elevation=0,kind='bridge'),dict(x=1300,y=300,elevation=140,kind='road')]))

class EvolutionTests(unittest.TestCase):
    def test_validation(self):
        self.assertEqual(validate(options())['population'],4)
        for key,value in [('population',101),('population',True),('mutationRate',1.1),('mutationStrength',0),('speed',float('nan')),('stagnation',0),('simulationSpeed',21)]:
            o=options();o[key]=value
            with self.assertRaises(ValueError):validate(o)
    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_gpu_roulette_handles_equal_zero_scores_and_mutation_preserves_exact_elite(self):
        p=probabilities([0,0,0,0]);self.assertTrue(p.is_cuda);self.assertTrue(torch.allclose(p,torch.full_like(p,.25)))
        layers=[(torch.arange(24,device='cuda',dtype=torch.float32).reshape(4,3,2)/24,torch.zeros(4,2,device='cuda'))]
        original=layers[0][0].clone();torch.manual_seed(8);children,parents=reproduce(layers,[0,1,3,2],1,.2)
        self.assertEqual(parents[0],2);self.assertTrue(torch.equal(children[0][0][0],original[2]));self.assertTrue(torch.equal(layers[0][0],original));self.assertFalse(torch.equal(children[0][0][1],original[parents[1]]))
        children,parents=reproduce(layers,[0,1,3,2],0,.2)
        for i,parent in enumerate(parents):self.assertTrue(torch.equal(children[0][0][i],original[parent]))
    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_batched_cuda_networks_match_each_exported_browser_network(self):
        for activation in ['tanh','relu']:
            o=options();o['config']['activation']=activation;torch.manual_seed(4);layers=[(torch.randn(4,a,b,device='cuda')*.1,torch.randn(4,b,device='cuda')*.1) for a,b in [(6,12),(12,2)]];x=torch.rand(4,6,device='cuda');expected=forward(x,layers,activation).cpu().tolist()
            payload=dict(models=[export(layers,i,o) for i in range(4)],inputs=x.cpu().tolist());script="const g=require('./kart/node-world.cjs').load();let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const d=JSON.parse(s);console.log(JSON.stringify(d.models.map((m,i)=>new g.EvolutionBrain(m).predict(d.inputs[i]))));});"
            result=json.loads(subprocess.run(['node','-e',script],input=json.dumps(payload),text=True,capture_output=True,check=True,cwd=ROOT.parents[1]).stdout)
            for i in range(4):
                for a,b in zip(expected[i],result[i]):self.assertAlmostEqual(a,b,places=5)
    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_tiny_real_cuda_two_generation_pipeline_with_shared_physics_and_pre_requested_stop(self):
        with tempfile.TemporaryDirectory(prefix='kart-evolution-fixture-') as directory:
            path=Path(directory)/'config.json';path.write_text(json.dumps(options()));run(path)
            status=json.loads((path.parent/'status.json').read_text());frame=json.loads((path.parent/'evolution.json').read_text());brain=json.loads((path.parent/'brain.json').read_text());population=json.loads((path.parent/'candidates.json').read_text())
            self.assertEqual(status['phase'],'complete');self.assertEqual(len(status['history']),2);self.assertEqual(len(frame['cars']),4);self.assertTrue(frame['done']);self.assertEqual(frame['shape'],[6,12,2]);self.assertEqual(len(frame['activations'][0][0]),6);self.assertEqual(brain['schema'],'kart-evolution-v1');self.assertEqual(brain['metadata']['inference'],'CUDA');self.assertEqual(len(population['candidates']),4);self.assertNotEqual(population['candidates'][0],population['candidates'][1])
        with tempfile.TemporaryDirectory(prefix='kart-evolution-stop-') as directory:
            path=Path(directory)/'config.json';path.write_text(json.dumps(options()));(path.parent/'stop').touch();run(path);status=json.loads((path.parent/'status.json').read_text());self.assertEqual(status['phase'],'stopped');self.assertEqual(status['history'],[])

    def test_read_only_population_api_validates_candidate_generation_and_preserves_completed_status(self):
        import server,threading,urllib.request,urllib.error,uuid
        from unittest.mock import patch
        old_root,old_job,old_current=server.ROOT,server.JOB,server.CURRENT
        with tempfile.TemporaryDirectory(prefix='kart-evolution-api-') as directory:
            server.ROOT=Path(directory);server.JOB=None;server.CURRENT=None
            key=str(uuid.uuid4());run_directory=server.ROOT/'runs'/key;run_directory.mkdir(parents=True)
            def write(name,data):(run_directory/name).write_text(json.dumps(data),encoding='utf-8')
            write('status.json',dict(phase='complete',brain=key,algorithm='track-evolution-v1'))
            write('evolution.json',dict(generation=2,cars=[dict(id=0,state='crashed')]))
            o=options();write('candidates.json',dict(generation=2,track=o['track'],config=o['config'],speed=o['speed'],candidates=[[]]))
            class QuietHandler(server.Handler):
                def log_message(self,*args):pass
            http=server.ThreadingHTTPServer(('127.0.0.1',0),QuietHandler);thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start();base='http://127.0.0.1:'+str(http.server_port)
            try:
                server.CURRENT=server.resume_status(key);self.assertIsNone(server.JOB)
                def get(path):
                    with urllib.request.urlopen(base+path) as response:return json.load(response)
                self.assertEqual(get('/api/status')['phase'],'complete');self.assertTrue(get('/api/device')['evolution3D'])
                self.assertEqual(get('/api/evolution?id='+key)['generation'],2)
                self.assertEqual(get('/api/evolution-model?id='+key+'&candidate=0&generation=2')['schema'],'kart-evolution-v1')
                for path,code in [('/api/evolution?id=../private',404),('/api/evolution-model?id='+key+'&candidate=-1',404),('/api/evolution-model?id='+key+'&candidate=0&generation=1',409)]:
                    with self.assertRaises(urllib.error.HTTPError) as e:get(path)
                    self.assertEqual(e.exception.code,code);e.exception.close()
                with patch.object(server.subprocess,'Popen') as launch,patch.object(torch.cuda,'is_available',return_value=True):
                    request=urllib.request.Request(base+'/api/start',data=json.dumps(o).encode(),headers={'Content-Type':'application/json'})
                    launch.return_value.poll.return_value=None
                    with urllib.request.urlopen(request) as response:self.assertIn('id',json.load(response))
                    self.assertEqual(Path(launch.call_args.args[0][1]).name,'evolution_train.py')
                    request=urllib.request.Request(base+'/api/stop',data=b'{}',headers={'Content-Type':'application/json'})
                    with urllib.request.urlopen(request):pass
                    self.assertTrue((server.CURRENT/'stop').exists())
                write('status.json',dict(phase='evaluating'))
                with self.assertRaises(ValueError):server.resume_status(key)
                with self.assertRaises(ValueError):server.resume_status('../private')
            finally:
                http.shutdown();http.server_close();thread.join();server.ROOT,server.JOB,server.CURRENT=old_root,old_job,old_current

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_stop_during_live_ticks_preserves_completed_champion(self):
        from unittest.mock import patch
        import evolution_train
        original=evolution_train.atomic
        with tempfile.TemporaryDirectory(prefix='kart-evolution-live-stop-') as directory:
            path=Path(directory)/'config.json';o=options();o['generations']=3;path.write_text(json.dumps(o),encoding='utf-8')
            def atomic(name,data):
                original(name,data)
                if name.name=='evolution.json' and data['generation']==2:(name.parent/'stop').touch()
            with patch.object(evolution_train,'atomic',side_effect=atomic):run(path)
            status=json.loads((path.parent/'status.json').read_text(encoding='utf-8'));brain=json.loads((path.parent/'brain.json').read_text(encoding='utf-8'))
            self.assertEqual(status['phase'],'stopped');self.assertEqual(len(status['history']),1);self.assertEqual(brain['metadata']['generation'],1);self.assertEqual(brain['metadata']['evaluation'],dict(steps=120,stagnation=30))
