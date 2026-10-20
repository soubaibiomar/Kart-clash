import * as THREE from '../gp/vendor/three.module.js';

/** Small deterministic outdoor light probe. No network assets or gameplay random calls. */
export function daylightPixels(width=128,height=64){
 const pixels=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sky=y<height/2,t=sky?y/(height/2):(y-height/2)/(height/2),top=sky?[81,121,166]:[160,153,133],bottom=sky?[210,221,225]:[70,78,66],sun=Math.exp(-((x-width*.7)**2+(y-height*.29)**2)/(width*.018)**2)*95,i=(y*width+x)*4;
  for(let c=0;c<3;c++)pixels[i+c]=Math.min(255,top[c]+(bottom[c]-top[c])*t+(sky?sun:0));pixels[i+3]=255;
 }
 return pixels;
}
export function daylightEnvironment(renderer,scene){
 const map=new THREE.DataTexture(daylightPixels(),128,64,THREE.RGBAFormat);map.mapping=THREE.EquirectangularReflectionMapping;map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(map);generator.dispose();map.dispose();scene.environment=target.texture;return target;
}

/** Micro relief shared by editor and game. Texture lifetime belongs to the material. */
export function surfaceTexture(asphalt=false){
 const size=128,data=new Uint8Array(size*size*4);let seed=1419;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(Math.imul(seed,1664525)+1013904223)|0;const grain=(seed>>>24)/255,brickRow=Math.floor(y/16),joint=y%16<1||(x+(brickRow%2)*16)%32<1,value=asphalt?172+grain*62:joint?120:206+grain*28,i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;texture.repeat.set(asphalt?4:2,4);return texture;
}
