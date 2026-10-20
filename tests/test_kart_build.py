import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('builder',Path(__file__).parents[1]/'kart/build-frontend.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
class BuildTests(unittest.TestCase):
 def fixture(self,root):
  for name in ['index.html','vehicle.js','libraries/p5.min.js','gp/behaviorManager.js','gp/steeringBehaviors.js','kart/app.js']:
   p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(name)
 def test_repeatable_preserves_unmanaged_and_private_files(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);self.fixture(root);first=builder.build(root);target=root/'dist/kart-clash';extra=target/'user-note.txt';extra.write_text('keep');private=root/'gp/models/secret.json';private.parent.mkdir();private.write_text('private')
   self.assertEqual(first,builder.build(root));self.assertEqual(extra.read_text(),'keep');self.assertFalse((target/'gp/models').exists());(root/'kart/app.js').write_text('new');self.assertNotEqual(first,builder.build(root));self.assertEqual((target/'kart/app.js').read_text(),'new');self.assertEqual(private.read_text(),'private')
 def test_traversal_rejected_before_writes(self):
  with tempfile.TemporaryDirectory() as temp:
   for name in ['../private','kart/../../outside',str(Path(temp).resolve()/'absolute')]:
    with self.assertRaises(ValueError):builder.safe_path(Path(temp),name)
 def test_collision_with_output_directory_fails_without_removing_contents(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);self.fixture(root);target=root/'dist/kart-clash/index.html';target.mkdir(parents=True);note=target/'user.txt';note.write_text('keep')
   with self.assertRaises(OSError):builder.build(root)
   self.assertEqual(note.read_text(),'keep')
if __name__=='__main__':unittest.main()
