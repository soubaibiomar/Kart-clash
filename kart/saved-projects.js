/** Persistent goals own detached circuit/model snapshots; no training or physics here. */
export function validateProject(value){
 if(!value||value.schema!=='kart-project-v1'||typeof value.name!=='string'||!value.name.trim()||value.name.length>60||typeof value.goal!=='string'||!value.goal.trim()||value.goal.length>240)throw Error('Projet invalide : nom et objectif requis.');
 const model=value.model?EvolutionBrain.validate(value.model):null,track=KartTrack.validate(value.track);
 if(model&&JSON.stringify(model.track)!==JSON.stringify(track))throw Error('Le modèle doit conserver son circuit exact.');
 return {schema:'kart-project-v1',name:value.name.trim(),goal:value.goal.trim(),track,model};
}
export function savedProjects(){const all=KartStorage.read('projects',[]);return Array.isArray(all)?all.flatMap(p=>{try{return [validateProject(p)];}catch{return [];}}):[];}
export function saveProject(value){const project=validateProject(value),all=savedProjects();if(all.some(p=>p.name===project.name))throw Error('Ce nom de projet existe déjà. Choisis un autre nom.');if(all.length>=24)throw Error('24 projets maximum. Exporte tes projets pour les conserver.');if(!KartStorage.write('projects',[...all,project]))throw Error('Sauvegarde impossible : stockage plein ou indisponible. Exporte le projet.');return project;}
export function projectText(project){return JSON.stringify(validateProject(project),null,2);}
export function importProject(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>2*1024*1024)throw Error('Fichier limité à 2 Mo.');return saveProject(JSON.parse(text));}
export function exportProject(project){const url=URL.createObjectURL(new Blob([projectText(project)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='kart-projet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
