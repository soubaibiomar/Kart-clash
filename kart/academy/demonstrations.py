"""Strict dataset contract, mirrored at the browser import boundary."""
import math

def validate_demo(d,config):
    if not isinstance(d,dict):raise ValueError('Démonstration requise')
    expected={'schema':'kart-demonstration-v2','modelSchema':'kart-combat-v2','actionSchema':'turn-throttle-fire-drift-v2','observationSchema':'local-v1','simulation':'rival-v3','dt':1/60}
    if any(d.get(k)!=v for k,v in expected.items()):raise ValueError('Version de démonstration incompatible')
    if d.get('gameplay','kart-classic-v1') not in ['kart-classic-v1','kart-arcade-v2']:raise ValueError('Profil de gameplay invalide')
    c=d.get('config',{})
    if c.get('sensors')!=config['sensors'] or c.get('range')!=config['range']:raise ValueError('Capteurs incompatibles avec la démonstration')
    if any(type(d.get(k)) is not int for k in ['seed','layout','bots']) or not 0<=d['bots']<=12 or d.get('difficulty') not in ['easy','normal','hard']:raise ValueError('Configuration de simulation invalide')
    samples=d.get('samples')
    if not isinstance(samples,list) or not 20<=len(samples)<=1800:raise ValueError('20–1800 relevés requis')
    last=-1
    for s in samples:
        if not isinstance(s,dict) or type(s.get('tick')) is not int or s['tick']<=last:raise ValueError('Ordre des ticks invalide')
        last=s['tick']
        for key,size in [('input',config['sensors']+21),('action',4)]:
            values=s.get(key)
            if not isinstance(values,list) or len(values)!=size or any(type(n) not in [int,float] or not math.isfinite(n) or not -1<=n<=1 for n in values):raise ValueError('Relevé invalide')
    events=d.get('events')
    if not isinstance(events,list) or len(events)>100 or any(not isinstance(e,dict) or e.get('type') not in ['elimination','respawn','finish'] or type(e.get('tick')) is not int or type(e.get('id')) is not int for e in events):raise ValueError('Événements invalides')
    return d

def split_samples(samples):
    # Hold out the final chronological fifth, separated by a one-second gap.
    boundary=max(1,int(len(samples)*.8))
    validation=samples[boundary:]
    cutoff=validation[0].get('tick',boundary*6)-60
    training=[s for i,s in enumerate(samples[:boundary]) if s.get('tick',i*6)<=cutoff]
    if not training or not validation:raise ValueError('Démonstration trop courte après séparation temporelle')
    return training,validation
