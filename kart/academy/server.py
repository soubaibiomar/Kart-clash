"""Optional loopback API. Starting it never starts a training job."""

import argparse,json,subprocess,sys,threading,uuid

from pathlib import Path

from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer

from urllib.parse import urlparse,parse_qs

from train import validate,invoke,validate_track



ROOT=Path(__file__).resolve().parent

LOCK=threading.Lock();JOB=None;CURRENT=None

class Handler(BaseHTTPRequestHandler):

    def allowed(self):

        host=self.headers.get('Host','').split(':')[0];origin=self.headers.get('Origin');return host in ['127.0.0.1','localhost'] and (not origin or origin in {f'http://{host}:{port}' for host in ['127.0.0.1','localhost'] for port in [8765,8870,8871]})

    def respond(self,data,code=200):

        raw=json.dumps(data,allow_nan=False).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')

        if self.allowed() and self.headers.get('Origin'):self.send_header('Access-Control-Allow-Origin',self.headers['Origin']);self.send_header('Vary','Origin')

        self.end_headers();self.wfile.write(raw)

    def do_OPTIONS(self):

        if not self.allowed():return self.respond({'error':'Local access only'},403)

        self.send_response(204);self.send_header('Access-Control-Allow-Origin',self.headers.get('Origin','http://127.0.0.1:8870'));self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type');self.end_headers()

    def do_GET(self):

        if not self.allowed():return self.respond({'error':'Local access only'},403)

        path=urlparse(self.path)

        if path.path=='/api/device':

            import torch

            return self.respond({'protocol':'rival-v3','gameplayV2':True,'tracks':True,'tracks3D':True,'trainingView':True,'adaptivePace':True,'evolution3D':True,'cuda':torch.cuda.is_available(),'gpu':torch.cuda.get_device_name() if torch.cuda.is_available() else None})

        if path.path=='/api/status':

            if CURRENT and (CURRENT/'status.json').exists():

                try:

                    status=json.loads((CURRENT/'status.json').read_text(encoding='utf-8'))

                    if JOB and JOB.poll() is not None and status.get('phase') in ['starting','imitation','evaluating']:status.update(phase='error',message='Le processus est sorti sans terminer. Voir le journal local du calcul.')

                    return self.respond(status)

                except (OSError,ValueError):return self.respond({'phase':'starting','message':'Écriture du relevé…'})

            if JOB and JOB.poll() is None:return self.respond({'phase':'starting','message':'Démarrage du processus local…'})

            return self.respond({'phase':'idle','message':'Aucun entraînement lancé.'})

        if path.path in ['/api/evolution','/api/evolution-model']:

            key=parse_qs(path.query).get('id',[''])[0]

            try:

                if str(uuid.UUID(key))!=key:raise ValueError('Identifiant invalide')

                directory=ROOT/'runs'/key

                if path.path=='/api/evolution':return self.respond(json.loads((directory/'evolution.json').read_text(encoding='utf-8')))

                index=int(parse_qs(path.query).get('candidate',['-1'])[0]);data=json.loads((directory/'candidates.json').read_text(encoding='utf-8'))

                if not 0<=index<len(data['candidates']):raise ValueError('Candidat absent')

                expected=parse_qs(path.query).get('generation',[str(data['generation'])])[0]

                if str(data['generation'])!=expected:return self.respond({'error':'La génération a changé. Sélectionne de nouveau le candidat.'},409)

                return self.respond(dict(schema='kart-evolution-v1',normalization='border-rays-v1',name='Candidat '+str(index+1),track=data['track'],config=data['config'],driving=dict(schema='track-pace-v1',maxSpeed=data['speed']),layers=data['candidates'][index],metadata=dict(trained=False,generation=data['generation'],candidate=index)))

            except (ValueError,OSError,KeyError):return self.respond({'error':'Population absente'},404)

        if path.path=='/api/brain':

            key=parse_qs(path.query).get('id',[''])[0]

            try:

                if str(uuid.UUID(key))!=key:raise ValueError()

                return self.respond(json.loads((ROOT/'runs'/key/'brain.json').read_text(encoding='utf-8')))

            except (ValueError,OSError):return self.respond({'error':'Cerveau absent'},404)

        return self.respond({'error':'Not found'},404)

    def do_POST(self):

        global JOB,CURRENT

        if not self.allowed():return self.respond({'error':'Local access only'},403)

        try:

            size=int(self.headers.get('Content-Length','0'))

            if size<0 or size>2500000:return self.respond({'error':'Requête trop grande'},413)

            options=json.loads(self.rfile.read(size) or '{}')

            if self.path=='/api/stop':

                if CURRENT:(CURRENT/'stop').touch()

                return self.respond({'stopping':True})

            if self.path=='/api/evaluate':

                # Explicit bounded evaluation only; no optimizer, mutation or saved-file write.

                import time

                steps=options.get('steps',900);seed=options.get('seed',2026)

                if type(steps) is not int or not 120<=steps<=7200 or type(seed) is not int or not 1<=seed<=2147483647:raise ValueError('Budget d’évaluation invalide')

                model=options.get('model')

                if not isinstance(model,dict):raise ValueError('Cerveau requis')

                track=options.get('track') or model.get('track')

                if track:validate_track(track)

                driving=model.get('driving')

                if 'driving' in model:

                    import math

                    if not track or not isinstance(driving,dict) or driving.get('schema')!='track-pace-v1' or type(driving.get('maxSpeed')) not in [int,float] or not math.isfinite(driving['maxSpeed']) or not 1.2<=driving['maxSpeed']<=8:raise ValueError('Profil de vitesse invalide')

                if not LOCK.acquire(blocking=False):return self.respond({'error':'Service occupé'},409)

                try:

                    if JOB and JOB.poll() is None:return self.respond({'error':'Attends la fin de l’entraînement.'},409)

                    deadline=time.monotonic()+25;scenarios=[];baseline=[]

                    for layout,offset in [(0,11),(1,37),(1,911)]:

                        settings={'gameplay':model.get('gameplay','kart-classic-v1'),'steps':steps,'seed':seed+offset,'layout':layout,'track':track,**({'speedLimit':model.get('driving',{}).get('maxSpeed',4.8)} if track else {})}

                        scenarios.append(invoke({'model':model,'options':settings},deadline)['metrics'])

                        baseline.append(invoke({'options':settings},deadline)['metrics'])

                    return self.respond({'scenarios':scenarios,'baseline':baseline,'evaluation':scenarios[-1],'evaluationSteps':steps,'evaluationSeed':seed,'simulation':('track-v2' if track['schema']=='kart-track-v2' else 'track-v1') if track else 'rival-v3'})

                except (RuntimeError,InterruptedError) as error:return self.respond({'error':str(error)},400)

                finally:LOCK.release()

            if self.path!='/api/start':return self.respond({'error':'Not found'},404)

            evolution=options.get('algorithm')=='track-evolution-v1'

            if evolution:

                from evolution_train import validate as validate_evolution

                validate_evolution(options)

            else:validate(options)

            import torch

            if not torch.cuda.is_available():return self.respond({'error':'CUDA indisponible'},503)

            with LOCK:

                if JOB and JOB.poll() is None:return self.respond({'error':'Un calcul est déjà en cours.'},409)

                key=str(uuid.uuid4());CURRENT=ROOT/'runs'/key;CURRENT.mkdir(parents=True);config=CURRENT/'config.json';config.write_text(json.dumps(options),encoding='utf-8')

                log=open(CURRENT/'worker.log','w',encoding='utf-8')

                JOB=subprocess.Popen([sys.executable,str(ROOT/('evolution_train.py' if evolution else 'train.py')),str(config)],stdout=log,stderr=log,cwd=ROOT);log.close()

            return self.respond({'id':key})

        except (ValueError,TypeError,KeyError) as error:return self.respond({'error':str(error)},400)



def resume_status(key):
    """Restore a finished run's diagnostics without launching any worker."""
    if str(uuid.UUID(key))!=key:raise ValueError('Identifiant invalide')
    directory=ROOT/'runs'/key
    state=json.loads((directory/'status.json').read_text(encoding='utf-8'))
    if state.get('phase') not in ['complete','stopped','error']:raise ValueError('Le calcul doit être terminé avant la reprise du relevé.')
    return directory

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8871)
    parser.add_argument('--resume-status',help='UUID of a finished run; diagnostics only, no training')
    args=parser.parse_args()
    if args.resume_status:CURRENT=resume_status(args.resume_status)
    print(f'Kart Clash Academy http://127.0.0.1:{args.port} — no training started',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
