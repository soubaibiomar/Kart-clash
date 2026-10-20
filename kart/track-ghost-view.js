import * as THREE from '../gp/vendor/three.module.js';
import {trackGhostPose} from './track-ghost.js';
import {updateKartWheels} from './kart-wheels.js';

export function clearTrackGhost(r){if(!r.ghost)return;r.scene.remove(r.ghost.model.root);r.ghost.material.dispose();r.resources.delete(r.ghost.material);r.ghost=null;}
export function setTrackGhost(r,entity,record){
 clearTrackGhost(r);if(!entity||!record)return;
 const model=r.populationKart(entity),material=new THREE.MeshBasicMaterial({color:'#a1e1ed',transparent:true,opacity:.32,depthWrite:false});r.resources.add(material);
 model.root.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=false;o.receiveShadow=false;}});model.ring.visible=false;model.root.visible=false;r.scene.add(model.root);r.ghost={entity,record,model,material,enabled:true};
}
/** Presentation-only playback; depth testing keeps buildings and tunnel walls opaque. */
export function updateTrackGhost(r,w){
 const ghost=r.ghost;if(!ghost)return;const {entity,record,model}=ghost,pose=trackGhostPose(record,w.time);entity.present(pose);
 const distance=pose?Math.hypot(pose.x-w.player.pos.x,pose.y-w.player.pos.y,pose.elevation-(w.player.elevation||0)):0;
 model.root.visible=!!pose&&ghost.enabled&&w.phase==='playing'&&distance>=45;if(!pose)return;
 model.root.position.set(pose.x,pose.elevation,pose.y);model.root.rotation.set(0,-pose.heading,Math.atan(pose.slopeVector.x*Math.cos(pose.heading)+pose.slopeVector.y*Math.sin(pose.heading)));updateKartWheels(model.wheels,entity);
}
