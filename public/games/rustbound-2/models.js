import {HOME_BODY,HOME_MOON} from './universe.js';
import {addLandmark} from './landmark-model.js';
import * as T from './vendor/three.module.js';
import {BODIES,ROCKS,LANDMARKS,terrainHeight,landingPoint,unit,sub,noise} from './world.js';
const Y=new T.Vector3(0,1,0),V=a=>new T.Vector3(...a);
export const mat={suit:new T.MeshStandardMaterial({color:'#dbe4e8',roughness:.66}),trim:new T.MeshStandardMaterial({color:'#aabac6',roughness:.58}),rubber:new T.MeshStandardMaterial({color:'#202b36',roughness:.9}),metal:new T.MeshStandardMaterial({color:'#8898a6',metalness:.78,roughness:.29}),dark:new T.MeshStandardMaterial({color:'#24313e',metalness:.5,roughness:.44}),red:new T.MeshStandardMaterial({color:'#a44037',roughness:.65}),gold:new T.MeshStandardMaterial({color:'#ab7960',metalness:.7,roughness:.42}),glass:new T.MeshStandardMaterial({color:'#0a2035',metalness:.88,roughness:.12,envMapIntensity:1.4}),light:new T.MeshBasicMaterial({color:'#d9f2f4'})};
export function mesh(g,m,parent,p=[0,0,0]){const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
export const box=(p,s,v,m=mat.suit)=>mesh(new T.BoxGeometry(...s),m,p,v);
export const cyl=(p,t,b,h,v,m=mat.metal,n=24)=>mesh(new T.CylinderGeometry(t,b,h,n),m,p,v);
export const sphere=(p,r,v,m=mat.suit,segments=24)=>mesh(new T.SphereGeometry(r,segments,16),m,p,v);
export function beam(p,a,b,r=.035,m=mat.metal){const v=V(a),end=V(b),o=cyl(p,r,r,v.distanceTo(end),v.clone().add(end).multiplyScalar(.5).toArray(),m,10);o.quaternion.setFromUnitVectors(Y,end.sub(v).normalize());return o;}
function ring(p,r,t,y,m=mat.trim){const o=mesh(new T.TorusGeometry(r,t,8,36),m,p,[0,y,0]);o.rotation.x=Math.PI/2;return o;}
function hose(p,points,r=.025,m=mat.rubber){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(V)),30,r,7,false),m,p);}
function label(text,bg='#cfdae1',fg='#253647'){const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,256,128);x.fillStyle=fg;x.font='bold 35px monospace';x.textAlign='center';x.fillText(text,128,76);return new T.CanvasTexture(c);}
function plaque(p,text,w,h,v){const material=new T.MeshStandardMaterial({map:label(text),roughness:.8});return box(p,[w,h,.014],v,material);}
export function prepareMaterials(renderer,scene){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),data=x.createImageData(256,256);for(let i=0;i<256*256;i++){const n=120+noise(i%256*.9,Math.floor(i/256)*.9)*12;data.data.set([n,n,n,255],i*4);}x.putImageData(data,0,0);const fabric=new T.CanvasTexture(c);fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.repeat.set(5,5);mat.suit.bumpMap=fabric;mat.suit.bumpScale=.006;
 const room=new T.Scene();room.background=new T.Color('#65788b');for(const [pos,scale] of [[[3,4,6],[4,5,1]],[[-4,2,3],[2,5,1]],[[0,6,-2],[4,1,3]]]){const o=new T.Mesh(new T.BoxGeometry(...scale),new T.MeshBasicMaterial({color:'#eef5f8'}));o.position.set(...pos);room.add(o);}const gen=new T.PMREMGenerator(renderer),env=gen.fromScene(room,.02);scene.environment=env.texture;scene.environmentIntensity=.42;gen.dispose();return env;
}
export {astronautModel} from './astronaut-model.js';
export function landerModel(){
 const root=new T.Group(),structure=new T.Group();root.add(structure);
 const profile=[[.63,1.3],[1.18,1.55],[1.22,2.2],[1.19,3.25],[1.05,3.55],[.89,4.1],[.65,5.45],[.42,5.8],[0,5.93]].map(a=>new T.Vector2(...a));mesh(new T.LatheGeometry(profile,64),mat.suit,structure);
 for(let i=0;i<18;i++)ring(structure,1.225,.018,1.8+i*.075,i%6===0?mat.trim:mat.suit);
 for(const y of [1.55,3.22,3.56])ring(structure,y>3.3?1.04:1.2,.04,y,mat.metal);
 const window=mesh(new T.SphereGeometry(.90,32,20,Math.PI*.28,Math.PI*.44,Math.PI*.32,Math.PI*.20),mat.glass,structure,[0,3.8,.28]);window.scale.set(.8,.7,1);
 for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const x=Math.sin(a),z=Math.cos(a),tank=cyl(structure,.23,.23,1.35,[x*1.05,2.25,z*1.05],mat.gold,24);for(const y of [1.7,2.8]){const strap=ring(tank,.235,.018,y-2.25,mat.metal);} }
 box(structure,[.65,.75,.12],[0,3.1,1.15],mat.trim);box(structure,[.5,.58,.06],[0,3.1,1.23],mat.dark);plaque(structure,'RB-02',.45,.15,[0,2.85,1.27]);
 for(let i=0;i<7;i++){box(structure,[.54,.045,.16],[0,.18+i*.33,1.58],mat.metal);}beam(structure,[-.3,.18,1.58],[-.3,2.45,1.58],.027);beam(structure,[.3,.18,1.58],[.3,2.45,1.58],.027);
 const legs=[];for(let i=0;i<4;i++){const a=Math.PI*.25+i*Math.PI/2,g=new T.Group();g.rotation.y=a;g.position.y=1.9;structure.add(g);sphere(g,.13,[0,0,1.03],mat.dark,16);beam(g,[0,0,1.03],[0,-1.68,2.8],.074);beam(g,[0,-.65,1.1],[0,-1.68,2.8],.05,mat.trim);beam(g,[0,-.08,1.18],[0,-1.03,2.16],.095,mat.metal);beam(g,[0,-1.03,2.16],[0,-1.65,2.8],.043,mat.metal);cyl(g,.41,.48,.11,[0,-1.82,2.8],mat.dark,24);cyl(g,.25,.25,.08,[0,-1.735,2.8],mat.metal,24);for(const s of [-1,1])beam(g,[s*.12,-.05,1.05],[s*.12,-1.6,2.8],.018,mat.dark);legs.push(g);}
 const engine=new T.Group();engine.position.y=1.15;structure.add(engine);sphere(engine,.25,[0,0,0],mat.metal,20);
 const bellProfile=[[.15,-.02],[.19,-.14],[.17,-.30],[.23,-.52],[.39,-.83],[.51,-1.04]].map(a=>new T.Vector2(...a));mesh(new T.LatheGeometry(bellProfile,48),new T.MeshStandardMaterial({color:'#48545a',metalness:.85,roughness:.4,side:T.DoubleSide}),engine);ring(engine,.51,.025,-1.04,mat.metal);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;hose(engine,[[Math.sin(a)*.17,-.15,Math.cos(a)*.17],[Math.sin(a)*.24,-.56,Math.cos(a)*.24],[Math.sin(a)*.47,-1,Math.cos(a)*.47]],.012,mat.metal);}
 const exhaust=new T.Group();engine.add(exhaust);const flames=[];for(const [r,h,color,opacity] of [[.46,5,'#8bbce3',.22],[.26,3.4,'#eef8ff',.65],[.10,1.8,'#ffffff',.9]]){const m=mesh(new T.ConeGeometry(r,h,32),new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending}),exhaust,[0,-1-h/2,0]);m.rotation.z=Math.PI;m.castShadow=false;flames.push(m);}
 beam(structure,[.6,4.2,-.3],[1,5.45,-.45],.018);sphere(structure,.035,[1,5.45,-.45],mat.light,12);for(const x of [-.7,.7])box(structure,[.10,.08,.08],[x,3.5,.7],mat.light);
 let gx=0,gz=0;return {root,engine,update(dt,demo){gx+=(demo.gimbal[0]-gx)*(1-Math.exp(-dt*12));gz+=(demo.gimbal[1]-gz)*(1-Math.exp(-dt*12));engine.rotation.set(gz,0,-gx);exhaust.visible=demo.burn>.015;exhaust.scale.set(1,Math.max(.05,demo.burn)*(.98+.025*Math.sin(demo.time*43)),1);structure.position.y=-demo.landingImpact*.11;for(const leg of legs)leg.rotation.x+=((demo.mode==='flight'?.035:0)-leg.rotation.x)*(1-Math.exp(-dt*5));}};
}
export function surfaceModel(id,{base=[HOME_BODY,HOME_MOON].includes(id)}={}){const b=BODIES[id],root=new T.Group();
 function frame(x,z,h=0){const group=new T.Group(),world=landingPoint(id,x,z,h);group.position.copy(V(sub(world,b.position)));group.quaternion.setFromUnitVectors(Y,V(unit(sub(world,b.position))));root.add(group);return group;}
 const rockGeometry=new T.IcosahedronGeometry(1,1),p=rockGeometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+noise(x*4+z,y*4)*.19;p.setXYZ(i,x*n,y*n,z*n);}rockGeometry.computeVertexNormals();const rocks=new T.InstancedMesh(rockGeometry,new T.MeshStandardMaterial({color:({dust:'#74523b',crater:'#7b8183',iron:'#69574a',shard:'#80718d',verdigris:'#51725b',frost:'#b2c8d3',volcanic:'#373039',haze:'#967044',crystal:'#6ba59e',basalt:'#5d526c',plon:'#bacac6'})[b.theme]||'#777777',roughness:1}),ROCKS[id].length),o=new T.Object3D();rocks.castShadow=rocks.receiveShadow=true;for(const r of ROCKS[id]){const point=sub(landingPoint(id,r.x,r.z,-r.size*.15),b.position);o.position.copy(V(point));o.rotation.set(r.seed*.1,r.seed*1.7,r.seed*.07);o.scale.set(r.size,r.size*.7,r.size*.86);o.updateMatrix();rocks.setMatrixAt(r.seed,o.matrix);}root.add(rocks);
 for(const mark of LANDMARKS[id]){const group=frame(mark.x,mark.z,-.15);group.scale.setScalar(mark.scale);addLandmark(group,b.theme);}
 const baseHardware=new T.Group();baseHardware.name='colony-landing-site';root.add(baseHardware);const firstBaseIndex=root.children.length;const pad=frame(0,0,.09),top=new T.MeshStandardMaterial({color:'#697476',roughness:.95,map:label('H','#6a7372','#c8c9b4')});cyl(pad,7,7,.16,[0,0,0],mat.dark,80);const cap=cyl(pad,6.9,6.9,.035,[0,.1,0],top,80); // A distinct raised cap, no coplanar paint overlays.
 const ringMark=ring(pad,5.7,.035,.135,mat.trim);
 for(const x of [-8,8])for(const z of [-8,8]){const lamp=frame(x,z);cyl(lamp,.07,.12,.7,[0,.35,0],mat.dark);cyl(lamp,.12,.12,.1,[0,.76,0],mat.light);}
 const flag=frame(-10,-3);cyl(flag,.025,.035,3,[0,1.5,0],mat.metal);const cloth=mesh(new T.PlaneGeometry(1.1,.62,18,8),new T.MeshStandardMaterial({color:'#c9c8bb',roughness:1,side:T.DoubleSide}),flag,[.56,2.62,0]),original=cloth.geometry.attributes.position.array.slice();
 const crate=frame(11,-5);box(crate,[1.4,.83,.9],[0,.45,0],mat.trim);for(const x of [-.49,.49])box(crate,[.10,.88,.94],[x,.45,0],mat.metal);plaque(crate,'SUPPLY',.65,.18,[0,.50,.465]);
 for(const object of root.children.slice(firstBaseIndex))baseHardware.attach(object);baseHardware.visible=base;return {root,baseHardware,update(time){if(baseHardware.visible&&b.atmosphere>40){const p=cloth.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=original[i*3];p.setZ(i,Math.sin(x*7+time*2.2)*.035*(x+.55));}p.needsUpdate=true;cloth.geometry.computeVertexNormals();}}};
}
