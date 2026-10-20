"""Local combat neuroevolution. CUDA tensors; exact shared JS gameplay evaluation.
No automatic runs. No old racing tensors or external APIs. Outputs isolated by UUID.
"""
import json, math, os, subprocess, sys, time
from pathlib import Path
import torch
from demonstrations import validate_demo,split_samples
from pace import PaceCurriculum

ROOT=Path(__file__).resolve().parent

def validate(options):
    if not isinstance(options,dict):raise ValueError('Configuration requise')
    if options.get('gameplay','kart-classic-v1') not in ['kart-classic-v1','kart-arcade-v2']:raise ValueError('Profil de gameplay invalide')
    c=options.get('config',{})
    if not isinstance(c,dict):raise ValueError('Topologie invalide')
    def integer(value,low,high):return type(value) is int and low<=value<=high
    if not integer(c.get('sensors'),5,17) or not isinstance(c.get('range'),(int,float)) or isinstance(c.get('range'),bool) or not 100<=c['range']<=400:raise ValueError('Capteurs invalides')
    if c.get('activation') not in ['tanh','relu'] or not isinstance(c.get('hidden'),list) or not 1<=len(c['hidden'])<=3 or any(not integer(n,4,64) for n in c['hidden']):raise ValueError('Couches invalides')
    for k,lo,hi in [('population',4,24),('generations',1,100),('epochs',0,3000),('steps',120,7200 if options.get('track') else 1800),('minutes',1,60),('seed',1,2147483647)]:
        if not integer(options.get(k),lo,hi):raise ValueError('Paramètre invalide: '+k)
    if not isinstance(options.get('name'),str) or not 1<=len(options['name'])<=60:raise ValueError('Nom invalide')
    if options.get('track') is not None:
        validate_track(options['track'])
        if options.get('demonstration') is not None:raise ValueError('Les démonstrations combat ne sont pas compatibles avec les circuits.')
    if options.get('pace') is not None:
        if not options.get('track'):raise ValueError('Progression réservée aux circuits')
        PaceCurriculum.validate(options['pace'])
    if options.get("demonstration") is not None:
        validate_demo(options["demonstration"],c)
        if options["demonstration"].get("gameplay","kart-classic-v1")!=options.get("gameplay","kart-classic-v1"):raise ValueError("Profil de démonstration incompatible")
    return options

def validate_track(t):
    if not isinstance(t,dict) or t.get('schema') not in ['kart-track-v1','kart-track-v2'] or not isinstance(t.get('name'),str) or not 1<=len(t['name'].strip())<=60 or type(t.get('closed')) is not bool or type(t.get('width')) not in [int,float] or not 120<=t['width']<=320 or not isinstance(t.get('points'),list) or not 3<=len(t['points'])<=240:raise ValueError('Circuit invalide')
    length=0
    for i,p in enumerate(t['points']):
        if not isinstance(p,dict) or any(type(p.get(k)) not in [int,float] or not math.isfinite(p[k]) or not lo<=p[k]<=hi for k,lo,hi in [('x',80,1720),('y',80,1320)]):raise ValueError('Point hors zone')
        if t['schema']=='kart-track-v2' and (type(p.get('elevation')) not in [int,float] or not math.isfinite(p['elevation']) or not 0<=p['elevation']<=240 or p.get('kind') not in ['road','bridge','tunnel']):raise ValueError('Altitude ou portion invalide')
        if i:
            a=t['points'][i-1];d=math.hypot(p['x']-a['x'],p['y']-a['y'])
            if d<8:raise ValueError('Points trop proches')
            length+=d
    if t['schema']=='kart-track-v2':
        if t['closed'] and math.hypot(t['points'][0]['x']-t['points'][-1]['x'],t['points'][0]['y']-t['points'][-1]['y'])<8:raise ValueError('Fermeture en doublon')
        for i in range(len(t['points'])-(0 if t['closed'] else 1)):
            a=t['points'][i];b=t['points'][(i+1)%len(t['points'])]
            if abs(a['elevation']-b['elevation'])>math.hypot(a['x']-b['x'],a['y']-b['y'])*.5+1e-6:raise ValueError('Pente trop forte')
        count=len(t['points'])-(0 if t['closed'] else 1)
        for i in range(count):
            for j in range(i+2,count):
                if t['closed'] and i==0 and j==count-1:continue
                a=t['points'][i];b=t['points'][(i+1)%len(t['points'])];c=t['points'][j];d=t['points'][(j+1)%len(t['points'])]
                rx=b['x']-a['x'];ry=b['y']-a['y'];sx=d['x']-c['x'];sy=d['y']-c['y'];den=rx*sy-ry*sx
                if abs(den)<1e-7:continue
                u=((c['x']-a['x'])*ry-(c['y']-a['y'])*rx)/den;v=((c['x']-a['x'])*sy-(c['y']-a['y'])*sx)/den
                if 0<=u<=1 and 0<=v<=1 and abs(a['elevation']+(b['elevation']-a['elevation'])*v-c['elevation']-(d['elevation']-c['elevation'])*u)<120:raise ValueError('Hauteur insuffisante au croisement')
    if length<300:raise ValueError('Circuit trop court')
    return t

def atomic(path,data):
    temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,allow_nan=False),encoding='utf-8')
    for attempt in range(10):
        try:os.replace(temp,path);return
        except PermissionError:
            if attempt==9:raise
            time.sleep(.02*(attempt+1))

def forward(x,layers,activation):
    a=x
    for i,(w,b) in enumerate(layers):
        a=a@w+b
        a=torch.tanh(a) if i==len(layers)-1 or activation=='tanh' else torch.relu(a)
    return a

def export(layers,options,metadata=None):
    return {**({'gameplay':options['gameplay']} if 'gameplay' in options else {}),**({'driving':{'schema':'track-pace-v1','maxSpeed':options['_track_speed']}} if options.get('track') and '_track_speed' in options else {}),**({'track':options['track']} if options.get('track') else {}),'schema':options['track']['schema'] if options.get('track') else 'kart-combat-v2','normalization':('track-deck-v2' if options['track']['schema']=='kart-track-v2' else 'track-local-v1') if options.get('track') else 'local-v1','name':options['name'],'config':options['config'],'layers':[{'w':w.detach().cpu().flatten().tolist(),'b':b.detach().cpu().tolist()} for w,b in layers],'metadata':metadata or {'trained':False}}

def invoke(request,deadline=None,stop=None):
    process=subprocess.Popen(['node',str(ROOT/'evaluate.cjs')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,cwd=ROOT.parents[1])
    payload=json.dumps(request)
    while True:
        if stop and stop.exists() or deadline and time.monotonic()>=deadline:
            process.terminate();process.communicate();raise InterruptedError('Evaluation interrupted')
        try:
            out,err=process.communicate(payload,timeout=.25);break
        except subprocess.TimeoutExpired:payload=None
    if process.returncode:raise RuntimeError(err[-1800:])
    return json.loads(out)

def evaluate(models,options,deadline=None,stop=None):
    return invoke({'models':models,'options':options},deadline,stop)

def run(path):
    options=validate(json.loads(path.read_text(encoding='utf-8')));run_dir=path.parent;status_path=run_dir/'status.json';stop=run_dir/'stop';started=time.monotonic();deadline=started+options['minutes']*60;history=[];state={'phase':'starting','config':options['config'],'history':history,'message':'Préparation CUDA…'};best_layers=None;epochs_done=0;pace=PaceCurriculum(options['pace']) if options.get('pace') else None
    if pace:options['_track_speed']=pace.current
    def report(**values):
        state.update(values);state['elapsed']=time.monotonic()-started;atomic(status_path,state)
    def stopped():return stop.exists() or time.monotonic()-started>options['minutes']*60
    try:
        if not torch.cuda.is_available():raise RuntimeError('CUDA indisponible. Aucun repli CPU pour l’apprentissage.')
        torch.manual_seed(options['seed']);device='cuda';c=options['config'];sizes=[c['sensors']+21,*c['hidden'],4]
        layers=[(torch.randn(a,b,device=device)*.1,torch.zeros(b,device=device)) for a,b in zip(sizes,sizes[1:])]
        best_layers=layers
        def publish_checkpoint(revision):
            atomic(run_dir/'brain.json',export(layers,options,{'trained':epochs_done>0,'generation':0,'evaluation':None,'passed':False,'phase':'imitation','note':'Poids courants, pas encore validés sur le circuit.'}))
            report(brain=run_dir.name,brainRevision=revision)
        publish_checkpoint('initial')
        def settings(seed,layout):
            return {'gameplay':options.get('gameplay','kart-classic-v1'),'steps':options['steps'],'seed':seed,'layout':layout,'track':options.get('track'),**({'speedLimit':options['_track_speed']} if pace else {})}
        baseline=[]
        for layout,offset in [(0,11),(1,37),(1,911)]:
            baseline.append(invoke({'options':settings(options['seed']+offset,layout)},deadline,stop)['metrics'])
        baseline_speed=options.get('_track_speed')
        report(baseline=baseline)
        # Real scripted combat decisions in two layouts, not labels from old F1 brains.
        report(phase='imitation',message='Collecte de démonstrations sur le circuit.' if options.get('track') else 'Collecte de démonstrations du bot combat dans deux dispositions.')
        samples=[]
        if options.get('demonstration'):
            samples=options['demonstration']['samples']
            report(message='Imitation des commandes réellement enregistrées par le joueur.',demonstrationSamples=len(samples))
        else:
            for layout in [0,1]:
                req={'options':{**settings(options['seed']+layout*37,layout),'demos':True,'config':c}}
                samples.extend(invoke(req,deadline,stop)['samples'])
        train_samples,validation_samples=split_samples(samples)
        x=torch.tensor([s['input'] for s in train_samples],device=device);y=torch.tensor([s['action'] for s in train_samples],device=device)
        vx=torch.tensor([s['input'] for s in validation_samples],device=device);vy=torch.tensor([s['action'] for s in validation_samples],device=device)
        imitation={'source':'player' if options.get('demonstration') else 'scripted','trainSamples':len(train_samples),'validationSamples':len(validation_samples),'split':'chronological 80/20 with 60 tick gap'}
        for pair in layers:
            for tensor in pair:tensor.requires_grad_(True)
        optimizer=torch.optim.Adam([t for pair in layers for t in pair],lr=.004)
        for epoch in range(options['epochs']):
            if stopped():break
            optimizer.zero_grad();prediction=forward(x,layers,c['activation']);loss=(prediction-y).square().mean();loss.backward();optimizer.step()
            epochs_done=epoch+1
            if epoch%25==0:
                report(message=f'Imitation {epoch+1}/{options["epochs"]} · erreur mesurée {loss.item():.5f}',epoch=epoch+1,loss=loss.item());publish_checkpoint('imitation-'+str(epoch+1))
        with torch.no_grad():imitation['validationLoss']=(forward(vx,layers,c['activation'])-vy).square().mean().item()
        report(imitation=imitation)
        layers=[(w.detach(),b.detach()) for w,b in layers];best_layers=layers;best_result=None;generation=0;passed=False
        for generation in range(1,options['generations']+1):
            if stopped():break
            if pace:
                options['_track_speed']=pace.current
                if baseline_speed!=pace.current:
                    baseline=[invoke({'options':settings(options['seed']+offset,layout)},deadline,stop)['metrics'] for layout,offset in [(0,11),(1,37),(1,911)]];baseline_speed=pace.current
            report(phase='evaluating',generation=generation,message=f'Évaluation réelle de {options["population"]} candidats · génération {generation}.')
            population=[best_layers]
            for _ in range(options['population']-1):population.append([(w+torch.randn_like(w)*.06,b+torch.randn_like(b)*.04) for w,b in best_layers])
            # Both layouts, fixed seeds across generations so fitness is comparable.
            models=[export(p,options) for p in population]
            a=evaluate(models,settings(options['seed']+11,0),deadline,stop);b=evaluate(models,settings(options['seed']+37,1),deadline,stop)
            scores=[(ra['metrics']['fitness']+rb['metrics']['fitness'])/2 for ra,rb in zip(a,b)];best=max(range(len(scores)),key=scores.__getitem__);best_layers=[(w.clone(),bias.clone()) for w,bias in population[best]];best_result=a[best]
            validation=evaluate([export(best_layers,options)],settings(options['seed']+911,1),deadline,stop)[0];v=validation['metrics'];passed=(v.get('laps',0)>=1 and v['contacts']<=5) if options.get('track') else (v['kills']>=1 and v['damage']>=80 and v['deaths']<=2)
            pace_report=pace.result([a[best]['metrics'],b[best]['metrics'],v]) if pace else None
            if pace:passed=pace_report['complete']
            history.append({'averageSpeed':v.get('averageSpeed'),'topSpeed':v.get('topSpeed'),'lapTime':v.get('lapTime'),'speedLimit':v.get('speedLimit'),'contacts':v.get('contacts'),'pace':pace_report,'generation':generation,'best':scores[best],'mean':sum(scores)/len(scores),'kills':best_result['metrics']['kills'],'validation':v['fitness']})
            meta={'pace':pace_report,'fitnessVersion':'track-laptime-v1' if options.get('track') else 'rival-v3','trained':True,'imitation':imitation,'algorithm':'CUDA imitation + elitist Gaussian mutation','device':torch.cuda.get_device_name(),'seed':options['seed'],'generation':generation,'evaluation':v,'passed':passed,'physics':'shared JS Vehicle on CPU','trainingLayouts':[0,1],'validationSeed':options['seed']+911,'baseline':baseline,'scenarios':[a[best]['metrics'],b[best]['metrics'],v],'simulation':('track-v2' if options['track']['schema']=='kart-track-v2' else 'track-v1') if options.get('track') else 'rival-v3','evaluationSteps':options['steps']}
            population_preview=[{'index':i,'fitness':scores[i],'metrics':result['metrics'],'preview':result['preview'],'activations':result.get('activations')} for i,result in enumerate(a)]
            atomic(run_dir/'brain.json',export(best_layers,options,meta));report(pace=pace_report,metrics=best_result['metrics'],preview=best_result['preview'],activations=best_result.get('activations'),population=population_preview,bestIndex=best,passed=passed,brain=run_dir.name,brainRevision=generation,history=history,validation=v,scenarios=[a[best]['metrics'],b[best]['metrics'],v],baseline=baseline,message=f'Génération {generation} évaluée · validation {v["fitness"]:.2f}.')
            if passed:break
        if best_result is None:
            atomic(run_dir/'brain.json',export(best_layers,options,{'trained':epochs_done>0,'generation':0,'evaluation':None,'passed':False,'device':torch.cuda.get_device_name(),'note':'Imitation seule, aucun score de combat validé.'}))
        report(phase='stopped' if stop.exists() else 'complete',brain=run_dir.name,passed=passed,message='Arrêt demandé ; dernier candidat achevé conservé.' if stop.exists() else 'Critère de validation atteint.' if passed else 'Budget terminé ; critère de validation non atteint. Le cerveau reste expérimental.')
    except InterruptedError:
        if best_layers is not None and not (run_dir/'brain.json').exists():atomic(run_dir/'brain.json',export(best_layers,options,{'trained':epochs_done>0,'generation':0,'evaluation':None,'passed':False,'note':'Calcul interrompu avant une évaluation complète.'}))
        report(phase='stopped' if stop.exists() else 'complete',brain=run_dir.name if (run_dir/'brain.json').exists() else None,message='Arrêt demandé ; dernier export achevé conservé.' if stop.exists() else 'Limite de temps atteinte ; dernier export achevé conservé.')
    except Exception as error:report(phase='error',message=str(error))

if __name__=='__main__':run(Path(sys.argv[1]))
