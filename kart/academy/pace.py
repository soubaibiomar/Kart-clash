"""A speed stage advances on repeated independent successful validations, never elapsed time."""
import math
class PaceCurriculum:
    def __init__(self,settings):
        self.start=settings['start'];self.current=self.start;self.maximum=settings['maximum'];self.step=settings.get('step',.4);self.confirmations=2;self.streak=0;self.stage=1;self.validated=None
    @staticmethod
    def validate(s):
        if not isinstance(s,dict):raise ValueError('Progression de vitesse invalide')
        for key,lo,hi in [('start',1.2,4.8),('maximum',1.2,8),('step',.1,1)]:
            value=s.get(key,.4 if key=='step' else None)
            if type(value) not in [int,float] or not math.isfinite(value) or not lo<=value<=hi:raise ValueError('Vitesse invalide: '+key)
        if s['maximum']<s['start']:raise ValueError('La vitesse cible doit dépasser la vitesse de départ')
        return s
    @staticmethod
    def safe(metrics):
        return metrics.get('laps',0)>=1 and metrics.get('collisionRate',1)<=.035 and metrics.get('idleSeconds',999)<=2
    def result(self,scenarios):
        tested=self.current;tested_stage=self.stage;good=len(scenarios)==3 and all(self.safe(m) for m in scenarios)
        self.streak=self.streak+1 if good else 0
        complete=good and tested>=self.maximum-1e-9 and self.streak>=self.confirmations
        if good and self.streak>=self.confirmations:
            self.validated=tested
            if not complete:self.current=round(min(self.maximum,tested+self.step),8);self.streak=0;self.stage+=1
        return {'schema':'track-pace-v1','tested':tested,'next':self.current,'maximum':self.maximum,'validated':self.validated,'streak':self.streak,'confirmations':self.confirmations,'stage':tested_stage,'safe':good,'complete':complete}
