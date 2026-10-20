class TrainingPresentation {
  static preview(frame,driverId){
    if(!frame)return null;
    if(frame.drivers){const index=frame.driverIds?.indexOf(Number(driverId));return index>=0?{...frame,...frame.drivers[index],driverId:Number(driverId)}:null;}
    return Number(frame.driverId)===Number(driverId)?frame:null;
  }
  static series(history,driverId,metric='loss'){
    const id=Number(driverId),samples=[];
    for(const h of history||[]){const i=h.driverIds?.indexOf(id)??-1;
      if(metric==='loss'){const value=i>=0?h.validationLosses?.[i]:null;if(Number.isFinite(value)&&h.phase==='warmstart')samples.push({x:h.epoch,y:value});}
      else if(metric==='fitness'&&i>=0&&Number.isFinite(h.fitnesses?.[i]))samples.push({x:h.generation,y:h.fitnesses[i],cohort:`${h.circuit} · départ ${Math.round((h.startFraction||0)*100)}%`});
    }
    if(metric==='fitness'&&samples.length){const cohort=samples.at(-1).cohort;return samples.filter(s=>s.cohort===cohort);}
    return samples;
  }
  static describe(report,selected=0){
    const status=report.status||'idle',phase=report.phase||'',running=status==='running';
    const title={idle:'Prêt à entraîner',running:phase==='warmstart'?'Initialisation des réseaux':phase==='evolution'?'Sélection génétique en cours':'Préparation du GPU',completed:'Modèles prêts',stopped:'Calcul arrêté',interrupted:'Session interrompue',error:'Calcul interrompu'}[status]||'État du calcul';
    const total=Number(phase==='warmstart'?report.epochs:report.generations)||0,current=Number(phase==='warmstart'?report.epoch:report.generation)||0;
    const progress=status==='completed'?1:total>0?Math.max(0,Math.min(1,current/total)):0,elapsed=Math.max(0,Math.floor(Number(report.elapsed)||0));
    return {title,progress,stage:phase==='warmstart'?`Étape d’imitation · ${current} / ${total}`:phase==='evolution'?`Génération · ${current} / ${total}`:status==='completed'?'Dernier entraînement terminé':'Aucun calcul automatique',duration:`${Math.floor(elapsed/60)} min ${elapsed%60} s`,drivers:report.driverIds?.length??report.models??selected,memory:`${Math.max(0,Number(report.allocatedMB)||0).toFixed(1)} Mo`,running};
  }
}
