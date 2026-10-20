import * as THREE from '../gp/vendor/three.module.js';

/** Static road decoration only. Keep camera shells and all physical entities untouched. */
export function batchRoadDecoration(r,parent){
 parent.updateWorldMatrix(true,true);const inverse=new THREE.Matrix4().copy(parent.matrixWorld).invert(),groups=new Map(),source=[];
 parent.traverse(mesh=>{if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.userData.staticRoad||mesh.userData.cameraSolid||Array.isArray(mesh.material))return;source.push(mesh);const box=mesh.geometry.type==='BoxGeometry',key=[mesh.material.id,box,!!mesh.castShadow,!!mesh.receiveShadow].join(':');if(!groups.has(key))groups.set(key,{box,material:mesh.material,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,meshes:[]});groups.get(key).meshes.push(mesh);});
 let unit=null,draws=0;
 for(const group of groups.values()){
  if(group.meshes.length<2)continue;let mesh;
  if(group.box){
   if(!unit){unit=new THREE.BoxGeometry(1,1,1);r.resources.add(unit);}
   mesh=new THREE.InstancedMesh(unit,group.material,group.meshes.length);
   group.meshes.forEach((item,i)=>{const p=item.geometry.parameters,matrix=new THREE.Matrix4().multiplyMatrices(inverse,item.matrixWorld);matrix.scale(new THREE.Vector3(p.width,p.height,p.depth));mesh.setMatrixAt(i,matrix);});
   mesh.instanceMatrix.needsUpdate=true;r.resources.add(mesh);
  }else{
   const attributes={position:[],normal:[],uv:[]};
   for(const item of group.meshes){const geometry=item.geometry.index?item.geometry.toNonIndexed():item.geometry.clone();geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,item.matrixWorld));for(const [name,size] of [['position',3],['normal',3],['uv',2]]){const attr=geometry.getAttribute(name);attributes[name].push(attr?new Float32Array(attr.array):new Float32Array(geometry.getAttribute('position').count*size));}geometry.dispose();}
   const geometry=new THREE.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2]]){const arrays=attributes[name],data=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const values of arrays){data.set(values,offset);offset+=values.length;}geometry.setAttribute(name,new THREE.BufferAttribute(data,size));}geometry.computeBoundingSphere();geometry.parameters={staticRoadBatch:true};r.resources.add(geometry);mesh=new THREE.Mesh(geometry,group.material);
  }
  mesh.castShadow=group.castShadow;mesh.receiveShadow=group.receiveShadow;mesh.userData.roadBatch=group.meshes.length;parent.add(mesh);for(const item of group.meshes)item.removeFromParent();draws++;
 }
 return {sources:source.length,draws,batched:[...groups.values()].filter(g=>g.meshes.length>1).reduce((n,g)=>n+g.meshes.length,0)};
}
