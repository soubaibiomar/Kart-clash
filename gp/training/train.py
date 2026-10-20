"""22 independent neural policies, CUDA warm-start + example-9 neuroevolution.

Each driver's population is selected and mutated independently. Evolution fitness
comes from simulated ray perception and locomotion, never a fabricated loss curve.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import time

import torch
from trainingWeights import resolve_weights

ROOT = Path(__file__).resolve().parent
MODELS = ROOT.parent / 'models'
INPUTS, HIDDEN, OUTPUTS, TURN = 18, 36, 2, 1.2
ANGLES = [-150, -90, -55, -30, -15, 0, 15, 30, 55, 90, 150, 180]


def replace_snapshot(temporary, path):
    # Windows readers/antivirus can briefly hold the destination open. Preserve the
    # previous complete snapshot and retry the atomic replacement, never truncate it.
    for attempt in range(10):
        try:
            os.replace(temporary, path)
            return
        except PermissionError:
            if attempt == 9:
                raise
            time.sleep(.02 * (attempt + 1))


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, allow_nan=False), encoding='utf-8')
    replace_snapshot(temporary, path)


def sigmoid_model(x, weights):
    return sigmoid_activations(x, weights)[1]


def sigmoid_activations(x, weights):
    w1, b1, w2, b2 = weights
    hidden=torch.sigmoid(torch.bmm(x,w1)+b1[:,None])
    return hidden,torch.sigmoid(torch.bmm(hidden,w2)+b2[:,None])


def random_weights(count, device):
    return [torch.randn(count, INPUTS, HIDDEN, device=device) * .25,
            torch.zeros(count, HIDDEN, device=device),
            torch.randn(count, HIDDEN, OUTPUTS, device=device) * .15,
            torch.zeros(count, OUTPUTS, device=device)]


def fitness_score(progress, survival, offtrack, smoothness, speed, management, config):
    return (progress*config['progress']+survival*config['survival']-offtrack*config['offtrack']
            -smoothness*config['smoothness']*(.75+management)+speed*config['speed'])


def select_population(population, scores, mutation_rate=.1, mutation_std=.045):
    """Stable roulette selection and mutation, separately along each driver axis."""
    drivers, count = scores.shape
    clean = torch.nan_to_num(scores, nan=-1e6, posinf=1e6, neginf=-1e6)
    fitness = (clean - clean.amin(1, keepdim=True)).clamp_min(0) + 1e-4
    probabilities = fitness / fitness.sum(1, keepdim=True)
    parents = torch.multinomial(probabilities, count, replacement=True)
    elite = clean.argmax(1)
    next_population = []
    driver_index = torch.arange(drivers, device=scores.device)[:, None]
    for tensor in population:
        selected = tensor[driver_index, parents].clone()
        noise = torch.randn_like(selected) * mutation_std
        mask = torch.rand_like(selected) < mutation_rate
        selected += noise * mask
        selected[:, 0] = tensor[torch.arange(drivers, device=scores.device), elite]
        next_population.append(selected)
    return next_population, elite


class CircuitRollout:
    """Batched counterpart of Vehicle's force/velocity/position integration.

    Circuit projection is only fitness/progress measurement. Network inputs are
    ray measurements, speed, grip, traffic flags and tactical lane request.
    """
    def __init__(self, track, drivers, population, device, styles):
        self.device = device
        self.drivers, self.population = drivers, population
        self.count = drivers * population
        points = torch.tensor(track['points'], device=device, dtype=torch.float32)
        self.a = points
        self.v = points.roll(-1, 0) - points
        self.lengths = self.v.norm(dim=1).clamp_min(1e-4)
        self.cumulative = torch.cat([torch.zeros(1, device=device), self.lengths.cumsum(0)])
        self.total = float(track['length'])
        self.radius = track['radius']
        walls = torch.tensor(track['borders'], device=device, dtype=torch.float32)
        self.wa, self.wv = walls[:, :2], walls[:, 2:] - walls[:, :2]
        self.styles = torch.tensor([s[1:] for s in styles], device=device).repeat_interleave(population, 0)
        self.offsets = torch.arange(-16, 17, device=device)
        self.angles = torch.tensor(ANGLES, device=device) * (math.pi / 180)

    def project(self, pos, preferred):
        indices = (preferred[:, None] + self.offsets) % len(self.a)
        a, v, length = self.a[indices], self.v[indices], self.lengths[indices]
        t = (((pos[:, None] - a) * v).sum(-1) / length.square()).clamp(0, 1)
        projected = a + t[:, :, None] * v
        distances = (pos[:, None] - projected).norm(dim=-1)
        k = distances.argmin(1)
        row = torch.arange(self.count, device=self.device)
        index = indices[row, k]
        along = self.cumulative[index] + t[row, k] * self.lengths[index]
        return along, distances[row, k], index

    def rays(self, pos, heading):
        direction = torch.stack([torch.cos(heading[:, None] + self.angles), torch.sin(heading[:, None] + self.angles)], -1)
        # Broadcast all segment intersections. Casting is also on CUDA.
        d = direction[:, :, None]
        q = self.wa[None, None] - pos[:, None, None]
        wall = self.wv[None, None]
        den = d[..., 0] * wall[..., 1] - d[..., 1] * wall[..., 0]
        parallel = den.abs() < 1e-8
        safe = torch.where(parallel, torch.ones_like(den), den)
        t = (q[..., 0] * wall[..., 1] - q[..., 1] * wall[..., 0]) / safe
        u = (q[..., 0] * d[..., 1] - q[..., 1] * d[..., 0]) / safe
        valid = ~parallel & (t >= 0) & (t <= 220) & (u >= 0) & (u <= 1)
        distances = torch.where(valid, t, 500).amin(2)
        return distances / 500

    def traffic(self, along0, tick):
        distance=(along0+torch.tensor([70.,150.,-70.],device=self.device)+tick*torch.tensor([2.6,3.4,3.],device=self.device))%self.total
        index=(torch.searchsorted(self.cumulative,distance,right=True)-1).clamp(0,len(self.a)-1)
        tangent=self.v[index]/self.lengths[index,None]
        normal=torch.stack([-tangent[:,1],tangent[:,0]],1)
        position=self.a[index]+tangent*(distance-self.cumulative[index])[:,None]+normal*torch.tensor([-22.,22.,0.],device=self.device)[:,None]
        return position,tangent*torch.tensor([2.6,3.4,3.],device=self.device)[:,None]

    def traffic_rays(self,pos,heading,traffic):
        direction=torch.stack([torch.cos(heading[:,None]+self.angles),torch.sin(heading[:,None]+self.angles)],-1)
        offset=traffic[None,None]-pos[:,None,None]
        along=(offset*direction[:,:,None]).sum(-1)
        cross=offset.square().sum(-1)-along.square()
        valid=(along>=0)&(along<=220)&(cross<=18**2)
        hit=(along-(18**2-cross).clamp_min(0).sqrt()).clamp_min(0)
        return torch.where(valid,hit,500).amin(2)/500

    @staticmethod
    def bounded(force, limit=.24):
        return force*(limit/force.norm(dim=-1).clamp_min(limit))[...,None]

    def safety_forces(self, pos, vel, heading, rays, traffic, traffic_vel):
        # Every candidate sees the same scripted traffic; candidates never interact.
        delta=pos[:,None]-traffic[None];distance=delta.norm(dim=-1)
        away=(delta/distance.clamp_min(1)[:,:,None].square())*(distance<=55)[:,:,None]
        direction=away.sum(1);separation=self.bounded(direction/direction.norm(dim=1).clamp_min(1e-8)[:,None]*9-vel)
        separation*=((distance<=55).any(1))[:,None]
        forward=torch.stack([torch.cos(heading),torch.sin(heading)],1);side=torch.stack([-forward[:,1],forward[:,0]],1)
        future=traffic[None]+traffic_vel[None]*8-pos[:,None]
        along=(future*forward[:,None]).sum(-1);lateral=(future*side[:,None]).sum(-1)
        threat=((along>=0)&(along<=120)&(lateral.abs()<=32))|(distance<=32)
        nearest=torch.where(threat,along,float('inf')).argmin(1);row=torch.arange(len(pos),device=self.device)
        sign=torch.where(lateral[row,nearest]>=0,-1.,1.)
        avoidance=self.bounded(forward*3+side*sign[:,None]*7-vel)*threat.any(1)[:,None]
        danger=rays*500<45
        directions=torch.stack([torch.cos(heading[:,None]+self.angles),torch.sin(heading[:,None]+self.angles)],-1)
        repel=-(directions*(danger*(1-(rays*500/45).clamp(0,1)))[:,:,None]).sum(1)
        borders=self.bounded(repel/repel.norm(dim=1).clamp_min(1e-8)[:,None]*9-vel)*danger.any(1)[:,None]
        return separation,avoidance,borders

    @torch.no_grad()
    def evaluate(self, population, steps=900, start_fraction=0, preview=None, objective='balanced', training_weights=None):
        if steps<1:raise ValueError('Evaluation needs at least one tick')
        if objective not in ['balanced','safe','pace']:raise ValueError('Unknown training objective')
        config=resolve_weights(objective,training_weights)
        weights = [p.flatten(0, 1) for p in population]
        along0 = self.total * start_fraction
        index = int(torch.searchsorted(self.cumulative, torch.tensor(along0, device=self.device), right=True)) - 1
        index = max(0, min(index, len(self.a) - 1))
        tangent = self.v[index] / self.lengths[index]
        normal = torch.stack([-tangent[1], tangent[0]])
        lane = torch.tensor([-22 if i % 2 == 0 else 22 for i in range(self.drivers)], device=self.device).repeat_interleave(self.population)
        pos = self.a[index][None].repeat(self.count, 1) + tangent * (along0 - self.cumulative[index]) + lane[:, None] * normal
        vel = tangent[None].repeat(self.count, 1) * 3
        heading = torch.atan2(vel[:, 1], vel[:, 0])
        preferred = torch.full((self.count,), index, device=self.device, dtype=torch.long)
        previous = torch.full((self.count,), along0, device=self.device)
        progress = torch.zeros(self.count, device=self.device)
        alive = torch.ones(self.count, device=self.device, dtype=torch.bool)
        smooth = torch.zeros(self.count, device=self.device)
        survived = torch.zeros(self.count, device=self.device)
        pace = torch.zeros(self.count, device=self.device)
        inputs = torch.zeros(self.count, INPUTS, device=self.device)
        inputs[:, 13] = .9 / 1.15
        inputs[:, 17] = .5 + lane / (self.radius * 2)
        for tick in range(steps):
            traffic,traffic_vel=self.traffic(along0,tick)
            if tick % 6 == 0:
                wall_rays=self.rays(pos, heading)
                inputs[:, :12] = torch.minimum(wall_rays,self.traffic_rays(pos,heading,traffic))
                scan_pos=pos.clone();scan_heading=heading.clone()
                f=torch.stack([torch.cos(heading),torch.sin(heading)],1);side=torch.stack([-f[:,1],f[:,0]],1)
                delta_traffic=traffic[None]-pos[:,None];a=(delta_traffic*f[:,None]).sum(-1);l=(delta_traffic*side[:,None]).sum(-1)
                front=(a>0)&(a<220)&(l.abs()<32);closing=(vel.norm(dim=1)[:,None]-(traffic_vel[None]*f[:,None]).sum(-1)).clamp(0,9)/9
                inputs[:,14]=torch.where(front,closing,0).amax(1)
                inputs[:,15]=((delta_traffic.norm(dim=-1)<90)&(l<0)).any(1)
                inputs[:,16]=((delta_traffic.norm(dim=-1)<90)&(l>=0)).any(1)
            speed = vel.norm(dim=1)
            inputs[:, 12] = (speed / 9).clamp(0, 1)
            hidden,out = sigmoid_activations(inputs[:, None], weights)
            hidden=hidden[:,0];out=out[:,0]
            angle = heading + (out[:, 0] - .5) * (2 * TURN)
            desired = torch.stack([torch.cos(angle), torch.sin(angle)], 1) * (out[:, 1:2] * 9)
            force = desired - vel
            limit = .24
            force=self.bounded(force)
            if any(config[k] for k in ['separation','avoidance','borders']):
                separation,avoidance,borders=self.safety_forces(pos,vel,heading,wall_rays,traffic,traffic_vel)
                force=self.bounded(force+separation*config['separation']+avoidance*config['avoidance']+borders*config['borders'])
            force *= alive[:, None]
            vel = torch.where(alive[:, None], vel + force, torch.zeros_like(vel))
            vel *= (12 / vel.norm(dim=1).clamp_min(12))[:, None]
            pos += vel
            heading = torch.where(vel.norm(dim=1) > .15, torch.atan2(vel[:, 1], vel[:, 0]), heading)
            along, lateral, preferred = self.project(pos, preferred)
            delta = torch.remainder(along - previous + self.total * 1.5, self.total) - self.total * .5
            delta = torch.maximum(torch.minimum(delta, vel.norm(dim=1) * 2 + 2), torch.full_like(delta, -1))
            progress += delta * alive
            previous = along
            survived += alive
            pace += (vel.norm(dim=1)/9).clamp(0,1)*alive
            smooth += force.square().sum(1) * alive
            alive &= (lateral < self.radius - 13) & torch.isfinite(pos).all(1)
            if preview is not None and (tick % 150 == 0 or tick == steps-1):
                drivers=[]
                for driver in range(self.drivers):
                    begin=driver*self.population;end=begin+self.population
                    leader=int(progress[begin:end].argmax())
                    drivers.append({'positions':pos[begin:end].cpu().tolist(),'alive':alive[begin:end].cpu().tolist(),
                                    'heading':heading[begin:end].cpu().tolist(),'progress':(progress[begin:end]/self.total).cpu().tolist(),
                                    'leader':leader,'speed':float(vel[begin+leader].norm()),
                                    'rays':inputs[begin+leader,:12].cpu().tolist(),'outputs':out[begin+leader].cpu().tolist(),
                                    'neural':{'inputs':inputs[begin+leader].cpu().tolist(),'hidden':hidden[begin+leader].cpu().tolist(),'outputs':out[begin+leader].cpu().tolist()},
                                    'rayOrigin':scan_pos[begin+leader].cpu().tolist(),'rayHeading':float(scan_heading[begin+leader])})
                preview({'tick':tick+1,'steps':steps,'drivers':drivers,'traffic':traffic.cpu().tolist(),'weights':config,**{key:drivers[0][key] for key in ['positions','alive','heading']}})
        management = self.styles[:, 2]
        # Each style changes its own objective, without moving ranks or positions.
        score=fitness_score(progress/self.total,survived/steps,(~alive).float(),smooth/steps,pace/steps,management,config)
        shaped=score.reshape(self.drivers,self.population)
        elite=shaped.argmax(1);rows=torch.arange(self.drivers,device=self.device)
        self.last_metrics={'fitnessMin':shaped.amin(1).cpu().tolist(),'fitnessMedian':shaped.median(1).values.cpu().tolist(),
                           'fitnessMax':shaped.amax(1).cpu().tolist(),'survival':alive.reshape(self.drivers,self.population).float().mean(1).cpu().tolist(),
                           'championProgress':(progress.reshape(self.drivers,self.population)[rows,elite]/self.total).cpu().tolist(),
                           'elite':elite.cpu().tolist()}
        return score.reshape(self.drivers, self.population)


def export_models(weights, ids, data, metadata):
    MODELS.mkdir(parents=True, exist_ok=True)
    records = []
    old = MODELS / 'manifest.json'
    if old.exists():
        previous = json.loads(old.read_text(encoding='utf-8'))
        for entry in previous.get('models', []):
            if entry['driverId'] not in ids:
                records.append(json.loads((MODELS / entry['file']).read_text(encoding='utf-8')))
    for row, driver in enumerate(ids):
        name = data['names'][driver]
        record = {'schema':'apex-driver-v1','driverId':driver,'name':name,'inputs':INPUTS,'hidden':HIDDEN,'outputs':OUTPUTS}
        for key, tensor in zip(['w1','b1','w2','b2'], weights):
            record[key] = tensor[row].detach().cpu().flatten().tolist()
        record['metadata'] = {**metadata, 'driverId':driver, 'validationLoss':metadata['validationLosses'][row],
                              'fitness':metadata.get('fitnesses', [0]*len(ids))[row],
                              'generation':metadata.get('generationsByDriver',[metadata['generation']]*len(ids))[row],
                              'epochs':metadata.get('epochsByDriver',[metadata['epochs']]*len(ids))[row]}
        digest = hashlib.sha256(json.dumps([record[k] for k in ['w1','b1','w2','b2']]).encode()).hexdigest()
        record['metadata']['sha256'] = digest
        record['metadata']['modelId'] = f"driver-{driver:02d}-{digest[:10]}"
        records.append(record)
    records.sort(key=lambda r:r['driverId'])
    entries = []
    for record in records:
        file = f"driver-{record['driverId']:02d}.json"
        atomic_json(MODELS / file, record)
        entries.append({'driverId':record['driverId'],'name':record['name'],'file':file,**record['metadata']})
    manifest = {'schema':'apex-bank-v1','models':entries,'updated':time.time()}
    atomic_json(old, manifest)
    bundle = 'const APEX_DRIVER_MODELS = '+json.dumps({'schema':'apex-bank-v1','models':records}, allow_nan=False)+';\n'
    temporary = MODELS / 'driver-models.js.tmp'
    temporary.write_text(bundle, encoding='utf-8')
    replace_snapshot(temporary, MODELS / 'driver-models.js')
    return entries


def save_warmstart(weights,ids,data,metadata,completed_epochs,losses):
    if completed_epochs<=0:return False
    partial=dict(metadata,epochs=completed_epochs,
                 epochsByDriver=[n-metadata['epochs']+completed_epochs for n in metadata['epochsByDriver']],
                 validationLosses=losses)
    export_models([w.detach().clone() for w in weights],ids,data,partial)
    return True


def train(args):
    if not torch.cuda.is_available() and args.device != 'cpu':
        raise RuntimeError('CUDA is unavailable. Training on the RTX 4060 is required; no silent CPU fallback.')
    device = torch.device('cpu' if args.device == 'cpu' else 'cuda')
    torch.manual_seed(args.seed)
    if device.type == 'cuda': torch.cuda.manual_seed_all(args.seed)
    torch.set_float32_matmul_precision('high')
    data = json.loads((ROOT / 'data/observations.json').read_text(encoding='utf-8'))
    ids = args.drivers or list(range(22))
    training_weights=resolve_weights(args.objective,json.loads(args.weights) if args.weights else None)
    name = torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU (explicit test mode)'
    state = {'status':'running','phase':'warmstart','device':str(device),'gpu':name,'seed':args.seed,'generation':0,'generations':args.generations,'driverIds':ids,'objective':args.objective,'population':args.population}
    state['weights']=training_weights
    started = time.time()
    history=[]
    def report(history_sample=True,**updates):
        state.update(updates);state['elapsed']=time.time()-started
        if history_sample:
            fitness=state.get('fitnesses')
            history.append({'phase':state.get('phase'),'epoch':state.get('epoch',0),'generation':state.get('generation',0),
                            'loss':state.get('loss'), 'fitness':sum(fitness)/len(fitness) if fitness else None,
                            'driverIds':ids,'validationLosses':state.get('validationLosses'),'fitnesses':fitness,
                            'metrics':state.get('metrics'),'circuit':state.get('circuit'),'startFraction':state.get('startFraction'),'weights':training_weights})
            state['history']=history[-200:]
        if device.type=='cuda': state['allocatedMB']=round(torch.cuda.memory_allocated()/1048576,1)
        atomic_json(ROOT / 'status.json', state)
        print(json.dumps(state, allow_nan=False), flush=True)
    weights = [torch.nn.Parameter(t) for t in random_weights(len(ids), device)]
    previous_generations=[0]*len(ids);previous_epochs=[0]*len(ids)
    if args.resume:
        for row,driver in enumerate(ids):
            file=MODELS/f'driver-{driver:02d}.json'
            if file.exists():
                record=json.loads(file.read_text(encoding='utf-8'))
                if record.get('schema')!='apex-driver-v1' or record.get('driverId')!=driver:raise ValueError('Invalid saved driver model')
                with torch.no_grad():
                    for tensor,key in zip(weights,['w1','b1','w2','b2']):tensor[row].copy_(torch.tensor(record[key],device=device).reshape(tensor[row].shape))
                previous_generations[row]=record['metadata']['generation'];previous_epochs[row]=record['metadata']['epochs']
    training, validation = [], []
    for driver in ids:
        samples = torch.tensor(data['samples'][driver], device=device, dtype=torch.float32)
        if len(samples)<20: raise ValueError(f'Not enough observations for driver {driver}')
        order = torch.randperm(len(samples), device=device)
        cut = max(1,int(len(samples)*.85));training.append(samples[order[:cut]]);validation.append(samples[order[cut:]])
    optimizer = torch.optim.Adam(weights, lr=.008)
    losses = [0] * len(ids)
    metadata = {'gpu':name,'device':str(device),'torch':torch.__version__,'cuda':torch.version.cuda,'seed':args.seed,
                'algorithm':'independent CUDA imitation warm-start + roulette selection/mutation',
                'epochs':args.epochs,'generation':0,'epochsByDriver':[n+args.epochs for n in previous_epochs],'generationsByDriver':previous_generations,'population':args.population,'validationLosses':losses,'trainedAt':time.time(),'objective':args.objective}
    metadata['weights']=training_weights
    for epoch in range(args.epochs):
        if (ROOT/'stop.request').exists():
            if epoch>0:
                losses=[float((sigmoid_model(v[None,:,:INPUTS],[w[i:i+1] for w in weights])[0]-v[:,INPUTS:]).square().mean().detach()) for i,v in enumerate(validation)]
                save_warmstart(weights,ids,data,metadata,epoch,losses)
            report(history_sample=False,status='stopped',phase='warmstart',epoch=epoch,models=len(ids) if epoch else 0,validationLosses=losses)
            return
        batch = torch.stack([samples[torch.randint(len(samples),(args.batch,),device=device)] for samples in training])
        output = sigmoid_model(batch[:,:,:INPUTS], weights)
        error = (output - batch[:,:,INPUTS:]).square()
        loss = (error[:,:,0]*12 + error[:,:,1]).mean()
        optimizer.zero_grad(set_to_none=True);loss.backward();optimizer.step()
        if epoch%100==0 or epoch==args.epochs-1:
            losses=[float((sigmoid_model(s[None,:,:INPUTS], [w[i:i+1] for w in weights])[0]-s[:,INPUTS:]).square().mean().detach()) for i,s in enumerate(validation)]
            report(epoch=epoch+1,epochs=args.epochs,loss=float(loss.detach()),validationLosses=losses)
    losses=[float((sigmoid_model(v[None,:,:INPUTS],[w[i:i+1] for w in weights])[0]-v[:,INPUTS:]).square().mean().detach()) for i,v in enumerate(validation)]
    champion = [w.detach().clone() for w in weights]
    export_models(champion,ids,data,metadata)
    styles = [data['styles'][i] for i in ids]
    population = [w[:,None].repeat((1,args.population)+(1,)*(w.ndim-1)) for w in champion]
    # First generation includes the trained model and local independent mutations.
    for w in population:
        w[:,1:] += torch.randn_like(w[:,1:]) * .025 * (torch.rand_like(w[:,1:])<.1)
    tracks = [t for t in data['tracks'] if not args.circuits or t['id'] in args.circuits]
    if not tracks: raise ValueError('No training circuits selected')
    for generation in range(args.generations):
        if (ROOT/'stop.request').exists(): report(status='stopped',phase='evolution');return
        track = tracks[generation % len(tracks)]
        environment = CircuitRollout(track,len(ids),args.population,device,styles)
        def preview(frame):
            report(history_sample=False,phase='evolution',generation=generation+1,circuit=track['id'],startFraction=start_fraction,fitnesses=None,metrics=None,
                   preview={**frame,'driverIds':ids,'driverId':ids[0],'circuit':track['id'],'points':track['points'],'radius':track['radius']})
        start_fraction=[0,.22,.47,.73][generation%4]
        scores = environment.evaluate(population,args.steps,start_fraction=start_fraction,preview=preview,objective=args.objective,training_weights=training_weights)
        next_population, elite = select_population(population,scores,mutation_std=args.mutation)
        rows = torch.arange(len(ids),device=device)
        champion = [w[rows,elite].clone() for w in population]
        fitness = scores[rows,elite].cpu().tolist()
        losses=[float((sigmoid_model(v[None,:,:INPUTS],[w[i:i+1] for w in champion])[0]-v[:,INPUTS:]).square().mean()) for i,v in enumerate(validation)]
        metadata.update(generation=generation+1,generationsByDriver=[n+generation+1 for n in previous_generations],fitnesses=fitness,
                        validationLosses=losses,trainedAt=time.time(),circuit=track['id'])
        export_models(champion,ids,data,metadata)
        report(phase='evolution',generation=generation+1,circuit=track['id'],startFraction=start_fraction,fitnesses=fitness,validationLosses=losses,metrics=environment.last_metrics)
        population = next_population
    checkpoint=ROOT/'checkpoints';checkpoint.mkdir(exist_ok=True)
    torch.save({'ids':ids,'weights':[w.cpu() for w in champion],'metadata':metadata},checkpoint/'latest.pt')
    report(history_sample=False,status='completed',phase='completed',models=len(ids))


def parser():
    p=argparse.ArgumentParser()
    p.add_argument('--epochs',type=int,default=2000)
    p.add_argument('--batch',type=int,default=256)
    p.add_argument('--population',type=int,default=24)
    p.add_argument('--generations',type=int,default=12)
    p.add_argument('--steps',type=int,default=900)
    p.add_argument('--mutation',type=float,default=.045)
    p.add_argument('--objective',choices=['balanced','safe','pace'],default='balanced')
    p.add_argument('--weights',default=None,help='JSON score and safety behavior weights')
    p.add_argument('--seed',type=int,default=2026)
    p.add_argument('--drivers',type=int,nargs='*')
    p.add_argument('--circuits',nargs='*')
    p.add_argument('--resume',action='store_true')
    p.add_argument('--device',choices=['cuda','cpu'],default='cuda')
    return p


if __name__=='__main__':
    try:
        train(parser().parse_args())
    except Exception as exc:
        try:state=json.loads((ROOT/'status.json').read_text(encoding='utf-8'))
        except (OSError,ValueError):state={}
        state.update(status='error',error=str(exc))
        atomic_json(ROOT/'status.json',state)
        raise
