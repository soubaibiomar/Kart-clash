"""Real CUDA population inference and roulette/mutation; shared JS Vehicle physics."""
import json,math,subprocess,time,sys
from pathlib import Path
import torch
from train import atomic,validate_track

ROOT=Path(__file__).resolve().parent
def validate(o):
    if not isinstance(o,dict) or o.get('algorithm')!='track-evolution-v1':raise ValueError('Mode génétique requis')
    validate_track(o.get('track'))
    c=o.get('config',{})
    for key,lo,hi in [('population',4,100),('generations',1,100),('steps',120,7200),('stagnation',30,1800),('seed',1,2147483647),('minutes',1,60)]:
        if type(o.get(key)) is not int or not lo<=o[key]<=hi:raise ValueError('Paramètre invalide: '+key)
    for key,lo,hi in [('mutationRate',0,1),('mutationStrength',.01,1),('speed',1.2,8),('simulationSpeed',1,20)]:
        if type(o.get(key)) not in [int,float] or not math.isfinite(o[key]) or not lo<=o[key]<=hi:raise ValueError('Paramètre invalide: '+key)
    if not isinstance(o.get('name'),str) or not 1<=len(o['name'].strip())<=60:raise ValueError('Nom invalide')
    if not isinstance(c,dict) or type(c.get('sensors')) is not int or not 5<=c['sensors']<=17 or type(c.get('range')) not in [int,float] or not 50<=c['range']<=500 or not isinstance(c.get('hidden'),list) or not 1<=len(c['hidden'])<=3 or any(type(n) is not int or not 4<=n<=64 for n in c['hidden']) or c.get('activation') not in ['tanh','relu']:raise ValueError('Réseau invalide')
    return o

def forward(x,layers,activation,trace=False):
    a=x;values=[a]
    for i,(w,b) in enumerate(layers):
        a=torch.bmm(a.unsqueeze(1),w).squeeze(1)+b
        a=torch.tanh(a) if i==len(layers)-1 or activation=='tanh' else torch.relu(a);values.append(a)
    return (a,values) if trace else a

def probabilities(scores):
    s=torch.as_tensor(scores,dtype=torch.float32,device='cuda')
    if not torch.isfinite(s).all():raise ValueError('Fitness non finie')
    # Stable version of the example's normalized 2**fitness, including all-zero fitness.
    weights=torch.exp2((s-s.max()).clamp(min=-30));return weights/weights.sum()

def reproduce(layers,scores,rate,strength):
    p=probabilities(scores);count=len(scores);parents=torch.multinomial(p,count,replacement=True);best=int(torch.argmax(torch.tensor(scores)));parents[0]=best
    result=[]
    for w,b in layers:
        cw=w[parents].clone();cb=b[parents].clone()
        cw+=torch.randn_like(cw)*strength*(torch.rand_like(cw)<rate);cb+=torch.randn_like(cb)*strength*(torch.rand_like(cb)<rate)
        cw.clamp_(-20,20);cb.clamp_(-20,20);cw[0]=w[best];cb[0]=b[best];result.append((cw,cb))
    return result,parents.cpu().tolist()

def export(layers,index,o,metadata=None):
    return dict(schema='kart-evolution-v1',normalization='border-rays-v1',name=o['name'],config=o['config'],track=o['track'],driving=dict(schema='track-pace-v1',maxSpeed=o['speed']),layers=[dict(w=w[index].detach().cpu().flatten().tolist(),b=b[index].detach().cpu().tolist()) for w,b in layers],metadata=metadata or dict(trained=False))

class Physics:
    def __init__(self):self.process=subprocess.Popen(['node',str(ROOT/'evolution-world.cjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,cwd=ROOT.parents[1],bufsize=1)
    def request(self,request):
        self.process.stdin.write(json.dumps(request)+'\n');self.process.stdin.flush();line=self.process.stdout.readline()
        if not line:raise RuntimeError('Le moteur physique est sorti: '+self.process.stderr.read()[-1200:])
        data=json.loads(line)
        if data.get('error'):raise ValueError(data['error'])
        return data
    def close(self):
        if self.process.poll() is None:self.process.terminate()
        self.process.communicate()

def run(path):
    o=validate(json.loads(path.read_text(encoding='utf-8')));directory=path.parent;stop=directory/'stop';started=time.monotonic();deadline=started+o['minutes']*60;history=[];worker=None;generation=0
    state=dict(algorithm='track-evolution-v1',phase='starting',config=o['config'],history=history,generation=0,message='Initialisation de la population CUDA…',brain=directory.name)
    def report(**values):state.update(values);state['elapsed']=time.monotonic()-started;atomic(directory/'status.json',state)
    def stopped():return stop.exists() or time.monotonic()>=deadline
    try:
        if not torch.cuda.is_available():raise RuntimeError('CUDA indisponible : aucun apprentissage CPU de secours.')
        torch.manual_seed(o['seed']);c=o['config'];shape=[c['sensors'],*c['hidden'],2];count=o['population']
        layers=[(torch.randn(count,a,b,device='cuda')*.25,torch.randn(count,b,device='cuda')*.05) for a,b in zip(shape,shape[1:])]
        atomic(directory/'brain.json',export(layers,0,o));worker=Physics();parents=list(range(count));report(device=torch.cuda.get_device_name(),neurons=sum(shape),shape=shape,populationSize=count)
        for generation in range(1,o['generations']+1):
            if stopped():break
            frame=worker.request(dict(command='init',track=o['track'],options=dict(count=count,config=c,speed=o['speed'],steps=o['steps'],stagnation=o['stagnation'],seed=o['seed'])))
            archive=dict(generation=generation,track=o['track'],config=c,speed=o['speed'],candidates=[export(layers,i,o,dict(trained=False,generation=generation,candidate=i,parent=parents[i]))['layers'] for i in range(count)])
            atomic(directory/'candidates.json',archive)
            last_publish=0;start_generation=time.monotonic();traces=[[] for _ in range(count)]
            report(phase='evaluating',generation=generation,message=f'Génération {generation} · {count} réseaux indépendants · inférence CUDA.')
            while not frame['done'] and not stopped():
                x=torch.tensor(frame['inputs'],device='cuda',dtype=torch.float32)
                with torch.no_grad():actions,activations=forward(x,layers,c['activation'],True)
                active=[car['state']=='running' for car in frame['cars']];values=[v.cpu().tolist() for v in activations]
                for i,alive in enumerate(active):
                    if alive:traces[i]=[[round(n,5) for n in layer[i]] for layer in values]
                frame=worker.request(dict(command='step',actions=actions.cpu().tolist()))
                now=time.monotonic()
                if now-last_publish>=.10 or frame['done']:
                    live={**frame,'generation':generation,'track':o['track'],'config':c,'shape':shape,'activations':traces,'speedLimit':o['speed']*60,'parents':parents}
                    atomic(directory/'evolution.json',live);last_publish=now
                    report(tick=frame['tick'],alive=sum(car['state']=='running' for car in frame['cars']),finished=sum(car['state']=='finished' for car in frame['cars']))
                delay=frame['tick']/60/o['simulationSpeed']-(time.monotonic()-start_generation)
                # Never hold stop/deadline handling for more than 20ms.
                while delay>0 and not stopped():time.sleep(min(.02,delay));delay=frame['tick']/60/o['simulationSpeed']-(time.monotonic()-start_generation)
            if stopped() and not frame['done']:break
            scores=[car['fitness'] for car in frame['cars']];best=max(range(count),key=scores.__getitem__);car=frame['cars'][best]
            row=dict(generation=generation,best=scores[best],mean=sum(scores)/count,finished=sum(k['state']=='finished' for k in frame['cars']),checkpoints=car['checkpoints'],time=car['elapsed'],candidate=best)
            history.append(row);metadata=dict(trained=True,generation=generation,candidate=best,fitness=car['fitness'],result=car,algorithm='roulette + Gaussian mutation + one elite',device=torch.cuda.get_device_name(),physics='shared JS Vehicle on CPU',inference='CUDA',seed=o['seed'],evaluation=dict(steps=o['steps'],stagnation=o['stagnation']))
            atomic(directory/'brain.json',export(layers,best,o,metadata));report(history=history,brainRevision=generation,bestIndex=best,message=f'Génération {generation} achevée · {row["finished"]} arrivé(s).')
            if generation<o['generations']:layers,parents=reproduce(layers,scores,o['mutationRate'],o['mutationStrength'])
        report(phase='stopped' if stop.exists() else 'complete',message='Arrêt demandé. Dernier champion achevé conservé.' if stop.exists() else 'Budget terminé. Le résultat ne garantit pas la maîtrise du circuit.')
    except Exception as error:report(phase='error',message=str(error))
    finally:
        if worker:worker.close()

if __name__=='__main__':run(Path(sys.argv[1]))
