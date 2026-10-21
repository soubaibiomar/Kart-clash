import unittest, tempfile, json
from pathlib import Path
import torch
from train import validate_track, run
from test_academy import options
class TrackTests(unittest.TestCase):
    def test_large_terrain_contract_without_training(self):
        t={'schema':'kart-track-v2','name':'XL','bounds':{'width':5400,'height':4200},'width':240,'cityDensity':.25,'closed':False,'points':[{'x':x,'y':2200,'elevation':0,'kind':'road','width':140 if i%2 else 320} for i,x in enumerate([2300,3500,4800])]}
        self.assertEqual(validate_track(t),t)
        for bounds in [None,{'width':5401,'height':4200},{'width':5400,'height':float('nan')},{'width':True,'height':4200}]:
            with self.assertRaises(ValueError):validate_track({**t,'bounds':bounds})
        with self.assertRaises(ValueError):validate_track({k:v for k,v in t.items() if k!='bounds'})

    def test_editor_curve_connector_matches_python_track_contract_without_training(self):
        import subprocess
        root=Path(__file__).resolve().parents[2]
        script="""import {createRequire} from 'node:module';import {TrackConnector} from './kart/track-connector.js';
const g=createRequire(import.meta.url)('./kart/node-world.cjs').load();globalThis.KartTrack=g.KartTrack;
const tracks=[0,120].map(height=>TrackConnector.close({schema:'kart-track-v2',name:'Connector fixture',width:160,closed:false,points:[[600,400,0],[1200,400,0],[1200,900,height],[900,900,height]].map(([x,y,elevation])=>({x,y,elevation,kind:elevation?'bridge':'road'}))},400).track);
console.log(JSON.stringify(tracks));"""
        result=subprocess.run(['node','--input-type=module','-e',script],cwd=root,capture_output=True,text=True,encoding='utf-8',check=True)
        for track in json.loads(result.stdout):
            self.assertEqual(validate_track(track),track)
            self.assertTrue(track['closed'])

    def track(self):return dict(schema='kart-track-v1',name='Temporary circuit fixture',width=200,closed=True,points=[dict(x=300,y=300),dict(x=1200,y=300),dict(x=1200,y=1000),dict(x=300,y=1000)])
    def test_local_widths_and_city_density_roundtrip(self):
        t=dict(schema='kart-track-v2',name='Tapered road',width=200,cityDensity=.25,closed=False,points=[dict(x=x,y=700,elevation=0,kind='road',width=w) for x,w in [(300,120),(900,320),(1500,140)]])
        self.assertEqual(validate_track(t),t)
        import copy
        for width in [0,119,321,float('nan'),True,'140']:
            broken=copy.deepcopy(t);broken['points'][1]['width']=width
            with self.assertRaises(ValueError):validate_track(broken)
        for density in [-1,2,float('nan'),True]:
            broken=copy.deepcopy(t);broken['cityDensity']=density
            with self.assertRaises(ValueError):validate_track(broken)

    def test_validation(self):
        self.assertEqual(validate_track(self.track())['width'],200)
        for key,value in [('width',0),('closed',1),('points',[]),('name','')]:
            t=self.track();t[key]=value
            with self.assertRaises(ValueError):validate_track(t)
    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_isolated_track_training_exports_geometry_and_real_progress(self):
        with tempfile.TemporaryDirectory(prefix='kart-track-fixture-') as directory:
            path=Path(directory)/'config.json';o=options();o['track']=self.track();o['epochs']=1;path.write_text(json.dumps(o));run(path)
            status=json.loads((path.parent/'status.json').read_text());brain=json.loads((path.parent/'brain.json').read_text())
            self.assertEqual(status['phase'],'complete');self.assertEqual(brain['schema'],'kart-track-v1');self.assertEqual(brain['track'],o['track']);self.assertIn('checkpoints',brain['metadata']['evaluation']);self.assertEqual(status['preview']['trackName'],o['track']['name'])

    def test_3d_track_validation_matches_javascript_crossing_clearance(self):
        t=dict(schema='kart-track-v2',name='Overpass',width=160,closed=False,points=[dict(x=300,y=300,elevation=0,kind='road'),dict(x=1500,y=1100,elevation=0,kind='bridge'),dict(x=1500,y=300,elevation=160,kind='bridge'),dict(x=300,y=1100,elevation=160,kind='tunnel')])
        self.assertEqual(validate_track(t)['schema'],'kart-track-v2')
        t['points'][2]['elevation']=t['points'][3]['elevation']=119
        with self.assertRaises(ValueError):validate_track(t)
        t['points'][2]['elevation']=t['points'][3]['elevation']=120
        self.assertEqual(validate_track(t)['schema'],'kart-track-v2')
    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_isolated_3d_track_training_and_export(self):
        with tempfile.TemporaryDirectory(prefix='kart-deck-fixture-') as directory:
            path=Path(directory)/'config.json';o=options();o['track']=self.track();o['track']['schema']='kart-track-v2'
            for i,p in enumerate(o['track']['points']):p.update(elevation=120 if i==2 else 0,kind='tunnel' if i==0 else 'bridge')
            o['epochs']=1;path.write_text(json.dumps(o));run(path)
            status=json.loads((path.parent/'status.json').read_text());brain=json.loads((path.parent/'brain.json').read_text())
            self.assertEqual(status['phase'],'complete');self.assertEqual(brain['schema'],'kart-track-v2');self.assertEqual(brain['normalization'],'track-deck-v2');self.assertEqual(brain['metadata']['simulation'],'track-v2');self.assertEqual(brain['track'],o['track']);self.assertIn('checkpoints',brain['metadata']['evaluation'])

    def test_all_city_presets_share_the_python_track_contract_without_training(self):
        import subprocess
        root=Path(__file__).resolve().parents[2]
        script="const g=require('./kart/node-world.cjs').load();console.log(JSON.stringify(g.CityTracks.catalog().map(t=>g.CityTracks.get(t.id))));"
        tracks=json.loads(subprocess.run(['node','-e',script],cwd=root,capture_output=True,text=True,encoding='utf-8',check=True).stdout)
        self.assertEqual(len(tracks),3)
        for track in tracks:
            self.assertEqual(validate_track(track),track)
            self.assertGreaterEqual(len(track['points']),60)

    @unittest.skipUnless(torch.cuda.is_available(),'CUDA unavailable')
    def test_tiny_disposable_city_evolution_uses_actual_shared_physics_on_cuda(self):
        import subprocess
        from evolution_train import run as evolution_run
        from test_evolution import options as evolution_options
        root=Path(__file__).resolve().parents[2]
        script="const g=require('./kart/node-world.cjs').load();console.log(JSON.stringify(g.CityTracks.get('@city-skyway')));"
        track=json.loads(subprocess.run(['node','-e',script],cwd=root,capture_output=True,text=True,encoding='utf-8',check=True).stdout)
        with tempfile.TemporaryDirectory(prefix='kart-city-cuda-fixture-') as directory:
            path=Path(directory)/'config.json';o=evolution_options();o.update(track=track,generations=1);path.write_text(json.dumps(o),encoding='utf-8');evolution_run(path)
            status=json.loads((path.parent/'status.json').read_text(encoding='utf-8'));frame=json.loads((path.parent/'evolution.json').read_text(encoding='utf-8'));brain=json.loads((path.parent/'brain.json').read_text(encoding='utf-8'))
            self.assertEqual(status['phase'],'complete');self.assertEqual(frame['track'],track);self.assertEqual(brain['metadata']['inference'],'CUDA');self.assertEqual(len(frame['cars']),4)
            self.assertTrue(all('surfaceIndex' in k and 'slopeVector' in k for k in frame['cars']))
