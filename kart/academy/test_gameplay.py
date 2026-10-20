"""Versioned rules and evaluator parity; no user run or model writes."""
import copy,json,subprocess,unittest
from pathlib import Path
import torch
from train import validate,export
from test_academy import options
from test_demonstrations import recorded

class GameplayTests(unittest.TestCase):
    def test_profiles_validate_and_export_without_changing_topology(self):
        for profile in ['kart-classic-v1','kart-arcade-v2']:
            o=options();o['gameplay']=profile;validate(o)
            layers=[(torch.zeros(26,4),torch.zeros(4)),(torch.zeros(4,5),torch.zeros(5)),(torch.zeros(5,4),torch.zeros(4))]
            model=export(layers,o)
            self.assertEqual(model['gameplay'],profile)
            self.assertEqual(model['schema'],'kart-combat-v2')
            request={'model':model,'options':{'steps':120,'seed':9,'gameplay':profile}}
            process=subprocess.run(['node',str(Path(__file__).with_name('evaluate.cjs'))],input=json.dumps(request),capture_output=True,text=True,check=True)
            self.assertEqual(json.loads(process.stdout)['metrics']['gameplay'],profile)
        o=options();o['gameplay']='unknown'
        with self.assertRaises(ValueError):validate(o)

    def test_demo_profile_cannot_silently_train_different_rules(self):
        o=options();d=recorded();o['config']=copy.deepcopy(d['config']);o['demonstration']=d;o['gameplay']='kart-arcade-v2'
        with self.assertRaises(ValueError):validate(o)
        d['gameplay']='kart-arcade-v2';self.assertEqual(validate(o)['gameplay'],'kart-arcade-v2')

if __name__=='__main__':unittest.main()
