"""Loopback-only UI/training service. Run with the project's CUDA virtualenv."""
import json
import argparse
import mimetypes
import os
from pathlib import Path
import subprocess
import sys
import threading
from trainingWeights import resolve_weights
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse,unquote

ROOT=Path(__file__).resolve().parent
WEB=ROOT.parents[1]
LOCK=threading.Lock()
JOB=None

def training_options():
    data=json.loads((ROOT/'data/observations.json').read_text(encoding='utf-8'))
    return {'circuits':[{'id':t['id'],'name':t.get('name',t['id'])} for t in data.get('tracks',[])], 'weightControls':1}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(WEB),**kwargs)
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        origin=self.headers.get('Origin')
        if origin and self.allowed():
            self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Vary','Origin')
            self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers','Content-Type')
        super().end_headers()
    def respond(self,data,status=200):
        encoded=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(encoded)));self.end_headers();self.wfile.write(encoded)
    def allowed(self):
        host=self.headers.get('Host','').split(':')[0]
        origin=self.headers.get('Origin')
        origins={f'http://{name}:{port}' for name in ['127.0.0.1','localhost'] for port in [8765,self.server.server_port]}
        return host in ['127.0.0.1','localhost'] and (not origin or origin in origins)
    def do_OPTIONS(self):
        if not self.allowed():return self.respond({'error':'Local access only'},403)
        return self.respond({'status':'ready'})
    def do_GET(self):
        if not self.allowed():return self.respond({'error':'Local access only'},403)
        path=unquote(urlparse(self.path).path)
        # Do not expose the interpreter, training observations, logs or checkpoints.
        if 'training' in path.split('/'):return self.respond({'error':'Private training files'},403)
        if path=='/api/training-options':
            try:return self.respond(training_options())
            except (OSError,ValueError,KeyError):return self.respond({'error':'Training circuit data unavailable'},503)
        if path=='/api/status':
            status=ROOT/'status.json'
            try:data=json.loads(status.read_text(encoding='utf-8')) if status.exists() else {'status':'idle'}
            except (OSError,ValueError):return self.respond({'error':'Training status is temporarily unavailable. Retry shortly.'},503)
            if JOB and JOB.poll() is not None and data.get('status')=='running':data.update(status='error',error='Training process exited. See the local training log.')
            if JOB is None and data.get('status')=='running':data.update(status='interrupted',error='Previous training session interrupted. Start or resume from this page.')
            return self.respond(data)
        if path=='/api/device':
            import torch
            return self.respond({'cuda':torch.cuda.is_available(),'gpu':torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,'torch':torch.__version__,'memoryGB':round(torch.cuda.get_device_properties(0).total_memory/1024**3,1) if torch.cuda.is_available() else 0})
        return super().do_GET()
    def do_POST(self):
        global JOB
        if not self.allowed():return self.respond({'error':'Local access only'},403)
        if self.headers.get('Content-Type')!='application/json':return self.respond({'error':'JSON required'},415)
        try:
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<8192:raise ValueError('Invalid request size')
            data=json.loads(self.rfile.read(length))
            if not isinstance(data,dict):raise ValueError('JSON object required')
            with LOCK:
                if self.path=='/api/stop':
                    if JOB is None or JOB.poll() is not None:return self.respond({'error':'No active training job'},409)
                    (ROOT/'stop.request').write_text('stop',encoding='utf-8');return self.respond({'status':'stopping'})
                if self.path!='/api/train':return self.respond({'error':'Unknown operation'},404)
                if JOB and JOB.poll() is None:return self.respond({'error':'Training already running'},409)
                import torch
                if not torch.cuda.is_available():return self.respond({'error':'CUDA unavailable. RTX training cannot start.'},409)
                values={}
                for key,default,lo,hi in [('epochs',1000,0,10000),('population',24,4,128),('generations',12,1,10000),('steps',900,120,3600),('seed',2026,1,4294967295)]:
                    raw=data.get(key,default)
                    if type(raw) is not int:raise ValueError(f'{key} must be an integer')
                    value=raw
                    if not lo<=value<=hi:raise ValueError(f'{key} outside allowed range')
                    values[key]=value
                drivers=data.get('drivers',list(range(22)))
                if not isinstance(drivers,list) or not drivers or any(type(d) is not int or d<0 or d>21 for d in drivers):raise ValueError('Invalid driver selection')
                objective=data.get('objective','balanced')
                if objective not in ['balanced','safe','pace']:raise ValueError('Invalid training objective')
                weights=resolve_weights(objective,data.get('weights'))
                if type(data.get('resume',True)) is not bool:raise ValueError('resume must be a boolean')
                if not (ROOT/'data/observations.json').exists():return self.respond({'error':'Generate observations with collect.mjs first.'},409)
                circuits=data.get('circuits')
                if circuits is not None:
                    allowed={t['id'] for t in training_options()['circuits']}
                    if not isinstance(circuits,list) or not circuits or any(not isinstance(c,str) or c not in allowed for c in circuits):raise ValueError('Invalid circuit selection')
                stop=ROOT/'stop.request'
                if stop.exists():stop.unlink()
                command=[sys.executable,str(ROOT/'train.py')]
                for key,value in values.items():command.extend(['--'+key,str(value)])
                command.extend(['--objective',objective])
                command.extend(['--weights',json.dumps(weights,separators=(',',':'))])
                if circuits is not None:command.extend(['--circuits',*dict.fromkeys(circuits)])
                command.extend(['--drivers',*map(str,sorted(set(drivers)))])
                if data.get('resume',True):command.append('--resume')
                logdir=ROOT/'logs';logdir.mkdir(exist_ok=True)
                from train import atomic_json
                atomic_json(ROOT/'status.json',{'status':'running','phase':'starting','driverIds':drivers,'generation':0,
                            'generations':values['generations'],'gpu':torch.cuda.get_device_name(0),'device':'cuda','objective':objective,'weights':weights})
                try:
                    with (logdir/'training.log').open('w',encoding='utf-8') as log:
                        JOB=subprocess.Popen(command,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
                except OSError:
                    JOB=None
                    atomic_json(ROOT/'status.json',{'status':'error','error':'Training process could not start'})
                    return self.respond({'error':'Training process could not start'},503)
                return self.respond({'status':'started','pid':JOB.pid})
        except (ValueError,TypeError,json.JSONDecodeError) as error:return self.respond({'error':str(error)},400)
        except OSError:return self.respond({'error':'Local training files are temporarily unavailable. Retry shortly.'},503)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    if not 1<=args.port<=65535:parser.error('port must be between 1 and 65535')
    mimetypes.add_type('text/javascript','.js')
    print(f'APEX: http://127.0.0.1:{args.port}/index.html',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
