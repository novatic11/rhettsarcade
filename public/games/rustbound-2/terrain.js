import {solarCloudModel} from './solar-clouds.js';
import {applySurface} from './surface-material.js';
import {gasGiantModel} from './giant-model.js';
import {scopeTextureSize} from './scope-textures.js';
import * as T from './vendor/three.module.js';
import {terrainHeight,noise,BODIES} from './world.js';
export function soilTexture(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d'),im=x.createImageData(512,512);for(let y=0;y<512;y++)for(let a=0;a<512;a++){const fine=noise(a*.7,y*.7),coarse=noise(a*.06,y*.06),vein=Math.abs(noise(a*.018+7,y*.018));let v=178+fine*32+coarse*18;if(vein<.025)v-=22;const i=(y*512+a)*4;im.data.set([v,v,v,255],i);}x.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
export function planetModel(body,texture,{detailed=true,segments=128,rows:resolutionRows=72}={}){
 const textureSize=scopeTextureSize(segments);
 if(body.giant)return gasGiantModel(body,{segments:Math.min(segments,128),rows:Math.min(resolutionRows,80),textureSize});
 const root=new T.Group();root.userData.terrainBody=body.id;const material=new T.MeshStandardMaterial({color:body.color,roughness:1,map:texture});
 applySurface(material,body,{detailed,textureSize});
 // The cap and globe share one exact boundary ring: adjacent triangles, no
 // overlapping surface mesh or depth-offset terrain patches.
 const angle=detailed?.22:0;
 for(const [start,span,rows] of (detailed?[[angle,Math.PI-angle,resolutionRows],[0,angle,resolutionRows]]:[[0,Math.PI,32]])){
  const geometry=new T.SphereGeometry(body.radius,detailed?segments:48,rows,0,Math.PI*2,start,span),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const n=new T.Vector3().fromBufferAttribute(p,i).normalize(),r=terrainHeight(body.id,n.toArray());p.setXYZ(i,n.x*r,n.y*r,n.z*r);}geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,material);mesh.userData.groundBody=body.id;mesh.receiveShadow=true;root.add(mesh);
 }
 const clouds=solarCloudModel(body,{segments:detailed?Math.min(segments,96):48,textureSize});if(clouds)root.add(clouds);return root;
}
