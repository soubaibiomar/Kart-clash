import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch,Mock
from urllib.request import Request,urlopen
from urllib.error import HTTPError

import torch
import train
import server


class NeuralMathTests(unittest.TestCase):
    def test_activation_export_matches_forward_pass_and_preserves_gradients(self):
        weights=[w.requires_grad_() for w in train.random_weights(2,'cuda')]
        inputs=torch.rand(2,3,18,device='cuda')
        hidden,outputs=train.sigmoid_activations(inputs,weights)
        self.assertEqual(tuple(hidden.shape),(2,3,36));self.assertTrue(torch.equal(outputs,train.sigmoid_model(inputs,weights)))
        outputs.sum().backward()
        self.assertTrue(all(w.grad is not None and bool(torch.isfinite(w.grad).all()) for w in weights))
    def test_training_weights_are_validated_and_zero_score_is_rejected(self):
        from trainingWeights import resolve_weights
        self.assertEqual(resolve_weights()['avoidance'],1.6)
        self.assertEqual(resolve_weights('pace')['progress'],1.25)
        for invalid in [[],{'unknown':1},{'speed':True},{'speed':float('nan')},{'speed':float('inf')},{'progress':-1},{'avoidance':5.01},{'speed':3.01},dict(progress=0,survival=0,offtrack=0,smoothness=0,speed=0)]:
            with self.assertRaises(ValueError):resolve_weights(overrides=invalid)
        values=resolve_weights(overrides=dict(separation=0,avoidance=0,borders=0))
        self.assertEqual(values['separation'],0)

    def test_each_score_weight_changes_only_its_own_term(self):
        from trainingWeights import resolve_weights
        terms=[torch.tensor([.6],device='cuda'),torch.tensor([.8],device='cuda'),torch.tensor([1.],device='cuda'),torch.tensor([.2],device='cuda'),torch.tensor([.5],device='cuda')]
        for key,expected in zip(['progress','survival','offtrack','smoothness','speed'],[.6,.8,-1.,-.25,.5]):
            config=resolve_weights(overrides={k:float(k==key) for k in ['progress','survival','offtrack','smoothness','speed']})
            score=train.fitness_score(*terms,torch.tensor([.5],device='cuda'),config)
            self.assertAlmostEqual(float(score),expected,places=5)

    def test_gpu_safety_forces_are_local_finite_bounded_and_composable(self):
        track={'points':[[0,0],[1000,0],[1000,1000],[0,1000]],'length':4000,'radius':80,'borders':[[0,-80,1000,-80],[1000,80,0,80]]}
        env=train.CircuitRollout(track,1,2,'cuda',[['a',.8,.9,.9]])
        pos=torch.tensor([[0.,0.],[500.,500.]],device='cuda');vel=torch.tensor([[3.,0.],[3.,0.]],device='cuda')
        heading=torch.zeros(2,device='cuda');rays=torch.ones(2,12,device='cuda');traffic=torch.tensor([[20.,0.],[2000.,2000.]],device='cuda');tv=torch.zeros_like(traffic)
        separation,avoidance,borders=env.safety_forces(pos,vel,heading,rays,traffic,tv)
        self.assertLess(float(separation[0,0]),0);self.assertLess(float(avoidance[0,1]),0)
        for f in [separation,avoidance,borders]:
            self.assertTrue(bool(torch.isfinite(f).all()));self.assertTrue(bool((f.norm(dim=1)<=.240001).all()));self.assertTrue(bool((f[1]==0).all()))
        self.assertTrue(bool((borders==0).all()))
        rays[0,5]=.02
        border=env.safety_forces(pos,vel,heading,rays,traffic,tv)[2]
        self.assertLess(float(border[0,0]),0)
        combined=env.bounded(separation*5+avoidance*5+border*5)
        self.assertTrue(bool((combined.norm(dim=1)<=.240001).all()))
        far=torch.tensor([[3000.,3000.]],device='cuda')
        self.assertTrue(bool((env.safety_forces(pos,vel,heading,torch.ones_like(rays),far,torch.zeros_like(far))[0]==0).all()))

    def test_score_weights_preserve_rollout_but_behavior_weights_change_movement(self):
        track={'points':[[0,0],[1000,0],[1000,1000],[0,1000]],'length':4000,'radius':80,'borders':[[0,-80,1000,-80],[1000,80,0,80]]}
        env=train.CircuitRollout(track,1,2,'cuda',[['a',.8,.9,.9]])
        torch.manual_seed(42)
        population=[w[:,None].repeat((1,2)+(1,)*(w.ndim-1)) for w in train.random_weights(1,'cuda')]
        frames=[];zero=dict(separation=0,avoidance=0,borders=0)
        baseline=env.evaluate(population,steps=12,preview=frames.append,training_weights=zero)
        other=[];changed=env.evaluate(population,steps=12,preview=other.append,training_weights={**zero,'progress':2})
        self.assertEqual(frames[-1]['positions'],other[-1]['positions']);self.assertFalse(torch.equal(baseline,changed))
        corrected=[];env.evaluate(population,steps=12,preview=corrected.append,training_weights={**zero,'avoidance':5})
        self.assertNotEqual(frames[-1]['positions'],corrected[-1]['positions'])
        self.assertEqual(len(corrected[-1]['traffic']),3);self.assertEqual(corrected[-1]['weights']['avoidance'],5)
        repeat=[];env.evaluate(population,steps=12,preview=repeat.append,training_weights={**zero,'avoidance':5})
        self.assertEqual(corrected[-1]['positions'],repeat[-1]['positions'])

    def test_stopping_imitation_saves_only_completed_epochs_without_changing_other_drivers(self):
        weights=[Mock() for _ in range(4)]
        metadata={'epochs':1000,'epochsByDriver':[1100,1200],'generation':4}
        with patch.object(train,'export_models') as export:
            self.assertFalse(train.save_warmstart(weights,[4,8],{},metadata,0,[.2,.3]))
            export.assert_not_called()
            self.assertTrue(train.save_warmstart(weights,[4,8],{},metadata,250,[.01,.02]))
            saved=export.call_args.args[3]
            self.assertEqual(saved['epochsByDriver'],[350,450])
            self.assertEqual(saved['validationLosses'],[.01,.02])
            self.assertEqual(export.call_args.args[1],[4,8])
            self.assertEqual(metadata['epochs'],1000)
    def test_status_writer_retries_transient_windows_reader_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'status.json'
            target.write_text('{"old":true}',encoding='utf-8')
            replace=train.os.replace
            calls=[]
            def locked(source,destination):
                calls.append(1)
                if len(calls)<3:
                    self.assertEqual(json.loads(target.read_text()),{'old':True})
                    raise PermissionError('Windows reader holds file')
                replace(source,destination)
            with patch.object(train.os,'replace',side_effect=locked),patch.object(train.time,'sleep') as sleep:
                train.atomic_json(target,{'ready':True})
            self.assertEqual(len(calls),3)
            self.assertEqual(sleep.call_count,2)
            self.assertEqual(json.loads(target.read_text()),{'ready':True})

    def test_status_writer_does_not_hide_a_persistent_write_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            target=Path(directory)/'status.json'
            target.write_text('{"old":true}',encoding='utf-8')
            with patch.object(train.os,'replace',side_effect=PermissionError('blocked')),patch.object(train.time,'sleep'):
                with self.assertRaises(PermissionError):train.atomic_json(target,{'ready':True})
            self.assertEqual(json.loads(target.read_text()),{'old':True})

    def test_cuda_is_the_real_rtx_device(self):
        self.assertTrue(torch.cuda.is_available())
        self.assertIn('4060',torch.cuda.get_device_name(0))
        w=train.random_weights(2,'cuda')
        x=torch.rand(2,8,18,device='cuda')
        result=train.sigmoid_model(x,w)
        self.assertEqual(result.device.type,'cuda')
        self.assertTrue(bool(torch.isfinite(result).all()))
        self.assertTrue(bool(((result>=0)&(result<=1)).all()))
        self.assertFalse(torch.equal(w[0][0],w[0][1]))

    def test_roulette_is_finite_at_zero_and_driver_populations_never_mix(self):
        weights=[torch.stack([torch.ones(5,2)*10,torch.ones(5,2)*20]).cuda()]
        scores=torch.zeros(2,5,device='cuda')
        result,elite=train.select_population(weights,scores,mutation_rate=0)
        self.assertTrue(bool((result[0][0]==10).all()))
        self.assertTrue(bool((result[0][1]==20).all()))
        self.assertEqual(elite.shape,(2,))
        scores[0,3]=100;scores[1,2]=100
        result,elite=train.select_population(weights,scores,mutation_rate=1,mutation_std=.01)
        self.assertEqual(elite.tolist(),[3,2])
        self.assertTrue(torch.equal(result[0][:,0],weights[0][torch.arange(2),elite]))

    def test_gpu_rollout_publishes_actual_positions(self):
        track={'points':[[0,0],[1000,0],[1000,1000],[0,1000]],'length':4000,'radius':80,
               'borders':[[0,-80,1000,-80],[1000,80,0,80],[1080,0,1080,1000],[920,1000,920,0]]}
        env=train.CircuitRollout(track,2,4,'cuda',[['a',.8,.9,.9],['b',.7,.8,.8]])
        population=[w[:,None].repeat((1,4)+(1,)*(w.ndim-1)) for w in train.random_weights(2,'cuda')]
        frames=[];scores=env.evaluate(population,steps=12,preview=frames.append)
        self.assertEqual(scores.shape,(2,4));self.assertTrue(bool(torch.isfinite(scores).all()))
        self.assertEqual(len(frames[0]['positions']),4);self.assertEqual(frames[0]['tick'],1)
        self.assertEqual(frames[-1]['tick'],12)
        self.assertEqual(len(frames[-1]['drivers']),2)
        for driver_index,driver in enumerate(frames[-1]['drivers']):
            self.assertEqual(len(driver['rays']),12)
            self.assertEqual(len(driver['outputs']),2)
            self.assertEqual(len(driver['rayOrigin']),2)
            self.assertTrue(all(0<=v<=1 for v in driver['outputs']))
            self.assertTrue(0<=driver['leader']<4)
            neural=driver['neural'];self.assertEqual([len(neural[k]) for k in ['inputs','hidden','outputs']],[18,36,2])
            selected=[w[driver_index:driver_index+1,driver['leader']] for w in population]
            hidden,output=train.sigmoid_activations(torch.tensor(neural['inputs'],device='cuda')[None,None],selected)
            self.assertTrue(torch.allclose(hidden[0,0],torch.tensor(neural['hidden'],device='cuda'),atol=1e-6))
            self.assertTrue(torch.allclose(output[0,0],torch.tensor(neural['outputs'],device='cuda'),atol=1e-6))
            self.assertEqual(neural['outputs'],driver['outputs'])
        self.assertEqual(len(env.last_metrics['survival']),2)
        self.assertTrue(all(0<=s<=1 for s in env.last_metrics['survival']))
        safe_frames=[]
        safe_scores=env.evaluate(population,steps=12,preview=safe_frames.append,objective='safe')
        self.assertFalse(torch.equal(scores,safe_scores))
        self.assertEqual(frames[-1]['positions'],safe_frames[-1]['positions'])
        with self.assertRaises(ValueError):env.evaluate(population,steps=0)
        with self.assertRaises(ValueError):env.evaluate(population,steps=12,objective='unknown')

    def test_exported_models_have_independent_weights_and_cuda_provenance(self):
        manifest=json.loads((train.MODELS/'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(len(manifest['models']),22)
        hashes=set()
        for entry in manifest['models']:
            model=json.loads((train.MODELS/entry['file']).read_text(encoding='utf-8'))
            self.assertEqual(model['driverId'],entry['driverId']);self.assertEqual(len(model['w1']),648)
            self.assertEqual(model['metadata']['device'],'cuda');hashes.add(model['metadata']['sha256'])
        self.assertEqual(len(hashes),22)


class PlatformTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        (self.root/'data').mkdir();(self.root/'data/observations.json').write_text('{"tracks":[{"id":"test-a","name":"Test A"}]}')
        self.patch=patch.object(server,'ROOT',self.root);self.patch.start()
        self.previous=server.JOB;server.JOB=None
        self.http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
        self.url=f'http://127.0.0.1:{self.http.server_port}'
    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.patch.stop();server.JOB=self.previous;self.temp.cleanup()
    def post(self,path,data,origin=None):
        headers={'Content-Type':'application/json'}
        if origin:headers['Origin']=origin
        return urlopen(Request(self.url+path,data=json.dumps(data).encode(),headers=headers),timeout=10)
    def test_training_page_is_public_but_engine_directory_is_private(self):
        response=urlopen(self.url+'/training.html');self.assertEqual(response.status,200);response.close()
    def test_page_loading_does_not_start_training(self):
        with patch.object(server.subprocess,'Popen') as process:
            status=json.load(urlopen(self.url+'/api/status'))
            self.assertEqual(status['status'],'idle');process.assert_not_called()
    def test_gpu_api_accepts_only_local_platform_cors_and_preflight_never_starts_training(self):
        origin='http://127.0.0.1:8765'
        with patch.object(server.subprocess,'Popen') as process:
            request=Request(self.url+'/api/train',method='OPTIONS',headers={'Origin':origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'})
            with urlopen(request) as response:
                self.assertEqual(response.headers['Access-Control-Allow-Origin'],origin)
                self.assertIn('POST',response.headers['Access-Control-Allow-Methods'])
                self.assertEqual(json.load(response)['status'],'ready')
            with urlopen(Request(self.url+'/api/training-options',headers={'Origin':origin})) as response:
                self.assertEqual(response.headers['Access-Control-Allow-Origin'],origin)
                self.assertEqual(json.load(response)['weightControls'],1)
            with self.assertRaises(HTTPError) as caught:urlopen(Request(self.url+'/api/status',headers={'Origin':'https://example.com'}))
            self.assertEqual(caught.exception.code,403);self.assertIsNone(caught.exception.headers.get('Access-Control-Allow-Origin'));caught.exception.close()
            process.assert_not_called()
    def test_custom_weights_are_forwarded_to_the_gpu_process_and_status(self):
        with patch.object(server.subprocess,'Popen',return_value=Mock(pid=123)) as process:
            json.load(self.post('/api/train',{'drivers':[0],'weights':{'progress':2.1,'avoidance':0}}))
            command=process.call_args.args[0];weights=json.loads(command[command.index('--weights')+1])
            self.assertEqual(weights['progress'],2.1);self.assertEqual(weights['avoidance'],0)
            self.assertEqual(json.loads((self.root/'status.json').read_text())['weights'],weights)
    def test_invalid_training_weights_never_launch_a_process(self):
        with patch.object(server.subprocess,'Popen') as process:
            for weights in [{'speed':-1},{'avoidance':99},{'borders':True},{'unknown':1},{'speed':float('nan')}]:
                with self.assertRaises(HTTPError) as caught:self.post('/api/train',{'weights':weights})
                self.assertEqual(caught.exception.code,400);caught.exception.close()
            process.assert_not_called()
    def test_start_is_explicit_validated_and_uses_project_cuda_interpreter(self):
        fake=Mock(pid=123);fake.poll.return_value=None
        with patch.object(server.subprocess,'Popen',return_value=fake) as process:
            reply=json.load(self.post('/api/train',{'drivers':[0,4],'epochs':0,'generations':3,'population':8,'steps':120,'resume':True,'objective':'safe','circuits':['test-a']}))
            self.assertEqual(reply['status'],'started');command=process.call_args.args[0]
            self.assertEqual(command[0],server.sys.executable);self.assertIn('--resume',command)
            self.assertEqual(command[command.index('--objective')+1],'safe');self.assertEqual(command[command.index('--circuits')+1],'test-a')
            self.assertEqual(command[-4:],['--drivers','0','4','--resume'])
            status=json.load(urlopen(self.url+'/api/status'));self.assertEqual(status['phase'],'starting')
            with self.assertRaises(HTTPError) as error:self.post('/api/train',{'drivers':[0]})
            self.assertEqual(error.exception.code,409)
            self.post('/api/stop',{});self.assertTrue((self.root/'stop.request').exists())
    def test_invalid_parameters_and_foreign_origins_cannot_launch_a_job(self):
        with patch.object(server.subprocess,'Popen') as process:
            for data in [[],None,{'epochs':True},{'steps':120.5},{'resume':'yes'},{'objective':'invalid'},{'drivers':[-1]},{'population':9999},{'drivers':[]},{'drivers':['0']}]:
                with self.assertRaises(HTTPError) as error:self.post('/api/train',data)
                self.assertEqual(error.exception.code,400)
            with self.assertRaises(HTTPError) as error:self.post('/api/train',{},origin='https://example.com')
            self.assertEqual(error.exception.code,403);process.assert_not_called()
    def test_only_available_circuits_are_exposed_and_accepted(self):
        with urlopen(self.url+'/api/training-options') as response:self.assertEqual(json.load(response)['circuits'][0]['id'],'test-a')
        with patch.object(server.subprocess,'Popen') as process:
            for circuits in [[],['unknown'],'test-a']:
                with self.assertRaises(HTTPError) as caught:self.post('/api/train',{'circuits':circuits})
                self.assertEqual(caught.exception.code,400);caught.exception.close()
            process.assert_not_called()
    def test_failed_process_launch_returns_recoverable_error(self):
        with patch.object(server.subprocess,'Popen',side_effect=OSError('cannot start')):
            with self.assertRaises(HTTPError) as error:self.post('/api/train',{'drivers':[0]})
            self.assertEqual(error.exception.code,503);error.exception.close()
            self.assertIsNone(server.JOB)
            self.assertEqual(json.loads((self.root/'status.json').read_text())['status'],'error')
    def test_training_files_are_private_even_when_url_encoded(self):
        for path in ['/gp/training/status.json','/gp/%74raining/.venv/pyvenv.cfg']:
            with self.assertRaises(HTTPError) as error:urlopen(self.url+path)
            self.assertEqual(error.exception.code,403)


if __name__=='__main__':unittest.main()
