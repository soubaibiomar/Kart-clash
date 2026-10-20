"""Repeatable allowlisted frontend build. Never remove unrelated output files."""
from pathlib import Path
import hashlib,json,os,tempfile
ROOT=Path(__file__).resolve().parent.parent

def safe_path(base,relative):
    base=Path(base)
    candidate=base/relative
    if Path(relative).is_absolute() or '..' in Path(relative).parts:
        raise ValueError('Unsafe output path')
    for p in [base,*candidate.parents,candidate]:
        if p.is_symlink() or (hasattr(p,'is_junction') and p.is_junction()):
            raise ValueError('Links/junctions are not build destinations')
    if not candidate.resolve().is_relative_to(base.resolve()):
        raise ValueError('Output escapes destination')
    return candidate

def build(root=ROOT):
    root=Path(root).resolve();target=safe_path(root,'dist/kart-clash')
    files=[root/'index.html',root/'vehicle.js',root/'libraries/p5.min.js',root/'gp/behaviorManager.js',root/'gp/steeringBehaviors.js',*sorted((root/'gp/vendor').glob('*.js')),*sorted((root/'gp/fonts').glob('*')),*sorted((root/'kart').glob('*.js')),*sorted((root/'kart').glob('*.css')),*sorted((root/'kart/entities').glob('*.js'))]
    payload={}
    for source in files:
        relative=source.relative_to(root)
        safe_path(root,relative)
        if not source.is_file():raise ValueError('Missing public dependency: '+str(relative))
        safe_path(target,relative)
        payload[relative.as_posix()]=source.read_bytes()
    hashes={name:hashlib.sha256(data).hexdigest() for name,data in sorted(payload.items())}
    identity=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest()[:12]
    payload['build.json']=(json.dumps({'id':identity,'files':hashes},indent=2)+'\n').encode()
    # Validate every path before any replacement. Each managed file is replaced atomically.
    for name in payload:
        destination=safe_path(target,name)
        if destination.exists() and not destination.is_file():raise OSError('Managed output is not a file: '+str(destination))
    for name,data in payload.items():
        destination=safe_path(target,name);destination.parent.mkdir(parents=True,exist_ok=True)
        fd,temp=tempfile.mkstemp(prefix='.kart-build-',dir=destination.parent)
        try:
            with os.fdopen(fd,'wb') as stream:stream.write(data)
            os.replace(temp,destination)
        finally:
            if Path(temp).exists():Path(temp).unlink()
    print(f'{target} · build {identity}')
    return identity
if __name__=='__main__':build()
