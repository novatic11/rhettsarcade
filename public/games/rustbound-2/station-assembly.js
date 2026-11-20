import * as T from './vendor/three.module.js';
import {CELL,DIRECTIONS,modulePorts} from './stations.js';
import {stationModuleModel} from './station-models.js';

const STRUCTURE=new Set(['core','hub','corridor','elbow','tee','cross','vertical']);
const OPPOSITE={xp:'xm',xm:'xp',yp:'ym',ym:'yp',zp:'zm',zm:'zp'};
const V=a=>new T.Vector3(...a);
const OFFSETS=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const TETRA=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];

// The logical construction cells stay untouched. Only their exterior pressure
// skin is welded: a smooth capsule union removes internal caps and flange seams.
export function pressureGeometry(features,step=.72){
 const cells=new Set(),samples=new Map(),edgeVertices=new Map(),positions=[],indices=[],owners=[];
 const key=(x,y,z)=>x+','+y+','+z;
 const prepared=features.map(f=>({...f,dx:f.b.x-f.a.x,dy:f.b.y-f.a.y,dz:f.b.z-f.a.z,inv:1/Math.max(f.a.distanceToSquared(f.b),1e-9)}));
 function distance(p,f){const x=p.x-f.a.x,y=p.y-f.a.y,z=p.z-f.a.z,t=T.MathUtils.clamp((x*f.dx+y*f.dy+z*f.dz)*f.inv,0,1);return Math.hypot(x-t*f.dx,y-t*f.dy,z-t*f.dz)-f.r;}
 function field(p){let value=Infinity;for(const f of prepared){const d=distance(p,f),h=Math.max(.48-Math.abs(value-d),0)/.48;value=Math.min(value,d)-h*h*.48*.25;}return value;}
 for(const f of features){const padding=f.r+.8+step,lo=f.a.clone().min(f.b).addScalar(-padding).divideScalar(step).floor(),hi=f.a.clone().max(f.b).addScalar(padding).divideScalar(step).ceil();for(let x=lo.x;x<hi.x;x++)for(let y=lo.y;y<hi.y;y++)for(let z=lo.z;z<hi.z;z++)cells.add(key(x,y,z));}
 const sample=(x,y,z)=>{const id=key(x,y,z);if(!samples.has(id)){const p=new T.Vector3(x*step,y*step,z*step);samples.set(id,{id,p,d:field(p)});}return samples.get(id);};
 function vertex(a,b){const id=a.id<b.id?a.id+'|'+b.id:b.id+'|'+a.id;if(edgeVertices.has(id))return edgeVertices.get(id);const t=a.d/(a.d-b.d),p=a.p.clone().lerp(b.p,t),i=positions.length/3;positions.push(...p.toArray());edgeVertices.set(id,i);return i;}
 function triangle(a,b,c,inside){const pa=V(positions.slice(a*3,a*3+3)),pb=V(positions.slice(b*3,b*3+3)),pc=V(positions.slice(c*3,c*3+3)),normal=pb.clone().sub(pa).cross(pc.clone().sub(pa));if(normal.lengthSq()<1e-16)return;if(normal.dot(inside.clone().sub(pa))>0)[b,c]=[c,b];indices.push(a,b,c);const center=pa.add(pb).add(pc).multiplyScalar(1/3);let nearest=Infinity,owner=null;for(const f of prepared){const d=distance(center,f);if(d<nearest){nearest=d;owner=f.owner;}}owners.push(owner);}
 for(const cell of cells){const [x,y,z]=cell.split(',').map(Number),corners=OFFSETS.map(o=>sample(x+o[0],y+o[1],z+o[2]));if(corners.every(v=>v.d>=0)||corners.every(v=>v.d<0))continue;for(const ids of TETRA){const inside=ids.map(i=>corners[i]).filter(v=>v.d<0),outside=ids.map(i=>corners[i]).filter(v=>v.d>=0);if(!inside.length||!outside.length)continue;if(inside.length===1){triangle(...outside.map(v=>vertex(inside[0],v)),inside[0].p);}else if(outside.length===1){triangle(...inside.map(v=>vertex(outside[0],v)),inside[0].p);}else{const a=vertex(inside[0],outside[0]),b=vertex(inside[0],outside[1]),c=vertex(inside[1],outside[0]),d=vertex(inside[1],outside[1]);triangle(a,b,c,inside[0].p);triangle(b,d,c,inside[0].p);}}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();return {geometry,owners};
}

export function stationAssembly(station){
 const root=new T.Group(),models=[],features=[],seen=new Set(),map=new Map(station.modules.map(n=>[n.cell.join(','),n]));
 root.name='continuous-orbital-assembly';
 const add=(a,b,r,owner)=>features.push({a:V(a),b:V(b),r,owner});
 for(const node of station.modules){
  const structural=STRUCTURE.has(node.type),model=stationModuleModel(node.type,{assembled:true}),center=node.cell.map(x=>x*CELL);
  model.root.position.set(...center);model.root.rotation.y=(node.rotation||0)*Math.PI/2;model.root.userData.nodeId=node.id;root.add(model.root);models.push({node,model});
  if(structural){if(!model.root.userData.hullOmitted)model.root.traverse(o=>{if(o.name==='station-batch-shell'||o.name==='station-batch-steel')o.visible=false;});add(center,center,node.type==='core'?3.35:node.type==='hub'?3.1:1.45,node.id);}
  for(const face of modulePorts(node)){
   const dir=DIRECTIONS[face],neighbor=map.get(node.cell.map((v,i)=>v+dir[i]).join(',')),joined=neighbor&&modulePorts(neighbor).includes(OPPOSITE[face]);
   if(joined){const pair=[node.id,neighbor.id].sort().join('|');if(seen.has(pair))continue;seen.add(pair);add(center,neighbor.cell.map(x=>x*CELL),structural||STRUCTURE.has(neighbor.type)?1.45:1.15,node.id);}
   else if(structural)add(center,center.map((v,i)=>v+dir[i]*4),1.45,node.id);
  }
 }
 const material=new T.MeshStandardMaterial({color:'#dbe4e8',roughness:.58,metalness:.10});
 const {geometry,owners}=pressureGeometry(features),hull=new T.Mesh(geometry,material);hull.name='welded-pressure-hull';hull.castShadow=hull.receiveShadow=true;hull.userData.pressureOwners=owners;root.add(hull);
 let disposed=false;
 return {root,models,hull,features,dispose(){if(disposed)return;disposed=true;models.forEach(x=>x.model.dispose());geometry.dispose();material.dispose();root.removeFromParent();}};
}
