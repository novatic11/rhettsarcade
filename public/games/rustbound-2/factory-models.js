import * as T from './vendor/three.module.js';
import {box,beam,cyl,sphere,mesh,mat} from './models.js';

const material=(color,roughness=.7,metalness=.3)=>new T.MeshStandardMaterial({color,roughness,metalness});
const finish={white:material('#dbe4e8',.58,.08),steel:material('#8898a6',.32,.82),blue:material('#49667d',.54,.22),
 cold:material('#cbdce5',.86,.04),coldTrim:material('#88a2b4',.58,.20),copper:material('#ab7960',.38,.75),
 mint:material('#88aeb2',.60,.12),amber:material('#bc925c',.55,.12)};
const finite=x=>Number.isFinite(x)?x:0;
let vaporTexture;
function torus(parent,r,t,p,m=mat.metal){return mesh(new T.TorusGeometry(r,t,7,32),m,parent,p);}
function ringY(parent,r,t,p,m=mat.metal){const o=torus(parent,r,t,p,m);o.rotation.x=Math.PI/2;return o;}
function pipe(parent,points,r=.045,m=mat.metal){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,6,false),m,parent);}
function bolts(parent,points,r=.026){
 const heads=new T.InstancedMesh(new T.CylinderGeometry(r,r,.024,6),mat.metal,points.length),o=new T.Object3D();o.rotation.x=Math.PI/2;
 points.forEach((p,i)=>{o.position.set(...p);o.updateMatrix();heads.setMatrixAt(i,o.matrix);});heads.castShadow=heads.receiveShadow=true;parent.add(heads);
}
function vent(parent,p,w=.7,h=.5,rotation=0){
 const g=new T.Group();g.position.set(...p);g.rotation.y=rotation;parent.add(g);box(g,[w,h,.065],[0,0,0],mat.dark);
 for(let i=0;i<6;i++)box(g,[w-.10,.028,.052],[0,-h*.35+i*h*.14,.068],mat.metal);return g;
}
function serviceBase(root){
 box(root,[4.5,.20,4.2],[0,.10,0],mat.dark);box(root,[4.36,.045,4.06],[0,.227,0],finish.steel);
 // The solid face ends at z=2.10, supporting externally attached cable ports.
 box(root,[4.4,1.04,.35],[0,.78,1.925],mat.trim);box(root,[4.38,.065,.39],[0,1.33,1.925],finish.blue);
 bolts(root,[-2.08,-1.48,0,1.48,2.08].flatMap(x=>[[x,.37,2.12],[x,1.20,2.12]]));
 for(const x of [-1.91,1.91])for(const z of [-1.78,1.78]){cyl(root,.21,.26,.09,[x,.288,z],mat.metal,16);}
}
function status(root,p,color='#b5cdd9'){
 const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.035,roughness:.38,metalness:.05});box(root,[.13,.075,.065],p,m);return m;
}
function coolingFan(parent,p,r=.35){
 const g=new T.Group();g.position.set(...p);parent.add(g);cyl(g,r+.08,r+.08,.21,[0,0,-.035],mat.dark,24).rotation.x=Math.PI/2;
 torus(g,r+.04,.035,[0,0,.09],mat.metal);const rotor=new T.Group();rotor.position.z=.105;g.add(rotor);
 cyl(rotor,.09,.09,.055,[0,0,0],mat.metal,12).rotation.x=Math.PI/2;
 for(let i=0;i<6;i++){const a=i*Math.PI/3,b=box(rotor,[r*.67,.13,.04],[Math.cos(a)*r*.48,Math.sin(a)*r*.48,0],finish.steel);b.rotation.z=a+.28;}
 for(const x of [-r*.58,r*.58])beam(g,[x,-r*.82,.155],[x,r*.82,.155],.012,mat.dark);return rotor;
}
function mistMap(){
 if(vaporTexture)return vaporTexture;
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=r<1?Math.round(Math.pow(1-r*r,2.5)*255):0;}
 vaporTexture=new T.DataTexture(data,size,size,T.RGBAFormat);vaporTexture.minFilter=vaporTexture.magFilter=T.LinearFilter;vaporTexture.needsUpdate=true;return vaporTexture;
}
function batchStaticParts(root,moving){
 // Bake stationary details by material; bolts remain instanced and machinery
 // keeps its articulation. This avoids a draw call for every small bracket.
 for(const scope of [root,...moving]){
  if(scope.isMesh)continue;root.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(scope.matrixWorld).invert(),buckets=new Map();
  scope.traverse(object=>{
   if(!object.isMesh||object.isInstancedMesh)return;
   for(let parent=object;parent&&parent!==scope;parent=parent.parent)if(moving.has(parent))return;
   const key=[object.material.uuid,Number(object.castShadow),Number(object.receiveShadow),object.renderOrder].join(':'),bucket=buckets.get(key)||[];bucket.push(object);buckets.set(key,bucket);
  });
  for(const objects of buckets.values()){
   if(objects.length<2)continue;let count=0;
   const transformed=objects.map(object=>{const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld));count+=g.attributes.position.count;return g;});
   const geometry=new T.BufferGeometry();
   for(const [attribute,size] of [['position',3],['normal',3],['uv',2]]){
    const array=new Float32Array(count*size);let offset=0;for(const g of transformed){array.set(g.attributes[attribute].array,offset);offset+=g.attributes[attribute].array.length;}geometry.setAttribute(attribute,new T.BufferAttribute(array,size));
   }
   const merged=new T.Mesh(geometry,objects[0].material);merged.name='batched-factory-hardware';merged.castShadow=objects[0].castShadow;merged.receiveShadow=objects[0].receiveShadow;merged.renderOrder=objects[0].renderOrder;
   objects.forEach(object=>object.removeFromParent());transformed.forEach(g=>g.dispose());scope.add(merged);
  }
 }
}

export function factoryBuildingModel(type){
 if(!['fabricator','cryoplant','reactor'].includes(type))throw new RangeError(`Unknown factory building: ${type}`);
 const root=new T.Group();root.name=`factory-${type}`;root.userData.building=type;root.userData.footprintRadius=3.15;
 serviceBase(root);
 const lights=[],moving=new Set();let animate=()=>{},height=4,previous=null,blend=0,phase=0;
 if(type==='fabricator'){
  height=4.51;
  for(const x of [-1.64,1.64]){
   box(root,[.36,.22,1.02],[x,.39,-.54],mat.dark);beam(root,[x,.48,-.80],[x,4.12,-.80],.105,mat.trim);
   beam(root,[x,.45,-1.12],[x,2.32,-1.12],.048,mat.metal);beam(root,[x,.45,-1.12],[x,1.66,-.35],.045,mat.metal);
   for(const y of [1.1,2.3,3.5])box(root,[.28,.12,.34],[x,y,-.8],mat.metal);
  }
  box(root,[3.68,.40,1.00],[0,4.14,-.72],finish.blue);box(root,[3.42,.16,1.05],[0,4.42,-.72],mat.trim);
  box(root,[.84,.63,.79],[0,3.58,-.67],finish.white);cyl(root,.24,.29,.29,[0,3.12,-.67],mat.metal,20);
  const press=new T.Group();press.position.set(0,2.55,-.67);root.add(press);box(press,[1.45,.25,.90],[0,0,0],mat.metal);box(press,[1.19,.11,.71],[0,-.19,0],finish.white);
  const piston=cyl(root,.13,.13,.70,[0,2.96,-.67],mat.metal,16);
  moving.add(press);moving.add(piston);
  for(const x of [-.98,.98]){beam(root,[x,.36,-1.64],[x,1.37,-1.64],.07);beam(root,[x,.36,1.45],[x,1.37,1.45],.07);box(root,[.13,.23,3.33],[x,1.33,-.1],finish.blue);}
  const rollers=[];
  for(let i=0;i<11;i++){
   const rotor=new T.Group();rotor.position.set(0,1.46,-1.55+i*.294);root.add(rotor);cyl(rotor,.105,.105,1.76,[0,0,0],mat.metal,14).rotation.z=Math.PI/2;rollers.push(rotor);moving.add(rotor);
  }
  const work=new T.Group();work.position.set(0,1.59,.15);root.add(work);box(work,[.91,.26,.70],[0,.14,0],mat.dark);cyl(work,.30,.32,.25,[0,.34,0],finish.white,16);for(const x of [-.36,.36])box(work,[.11,.36,.42],[x,.30,0],finish.steel);
  const shoulder=new T.Group();shoulder.position.set(-1.55,1.54,.80);root.add(shoulder);cyl(root,.23,.27,1.25,[-1.55,.93,.8],finish.white,20);
  const upper=new T.Group();shoulder.add(upper);box(upper,[.23,.79,.24],[0,.395,0],finish.blue);cyl(upper,.15,.15,.29,[0,.03,0],mat.metal,16).rotation.x=Math.PI/2;
  const elbow=new T.Group();elbow.position.y=.79;upper.add(elbow);box(elbow,[.20,.73,.21],[0,.365,0],finish.white);cyl(elbow,.13,.13,.27,[0,0,0],mat.metal,16).rotation.x=Math.PI/2;
  moving.add(work);moving.add(upper);moving.add(elbow);
  box(elbow,[.30,.16,.25],[0,.78,0],mat.dark);for(const x of [-.12,.12])box(elbow,[.065,.26,.12],[x,.96,0],mat.metal);
  pipe(root,[[-1.74,.62,.77],[-1.74,1.7,.77],[-1.48,2.15,.70]],.035,mat.rubber);
  box(root,[.62,1.02,.83],[1.48,1.03,.58],mat.trim);vent(root,[1.48,1.06,1.035],.46,.58);lights.push(status(root,[1.48,1.63,1.04]));
  bolts(root,[[-1.41,4.16,-.20],[1.41,4.16,-.20],[-.66,2.55,-.20],[.66,2.55,-.20]]);
  animate=(a)=>{
   press.position.y=2.55-Math.max(0,Math.sin(phase))*.20;piston.position.y=(3.12+press.position.y+.12)/2;piston.scale.y=(3.12-press.position.y-.12)/.70;
   for(const roller of rollers)roller.rotation.x=-phase*2.8;
   upper.rotation.z=-.45+Math.sin(phase*.5)*.055;elbow.rotation.z=-1.42+Math.sin(phase*.5+.7)*.07;
   work.position.z=.15+Math.sin(phase*.25)*.18;
  };
 }else if(type==='cryoplant'){
  height=4.80;
  const shape=[[0,.58],[.68,.58],[.97,.83],[1.02,1.04],[1.02,2.78],[.94,3.09],[.66,3.36],[0,3.47]].map(p=>new T.Vector2(...p));
  const tank=mesh(new T.LatheGeometry(shape,40),finish.cold,root,[.12,0,-.55]);
  for(const y of [1.0,1.85,2.79])ringY(root,1.04,.043,[.12,y,-.55],mat.metal);ringY(root,1.045,.058,[.12,2.41,-.55],finish.coldTrim);
  for(const x of [-.6,.84])for(const z of [-1.1,0])beam(root,[x,.30,z],[x,.86,z],.07,mat.metal);
  box(root,[.83,1.35,1.15],[-1.50,1.03,-.48],mat.trim);const fan=coolingFan(root,[-1.5,1.04,.145],.29);
  moving.add(fan);
  const jacket=pipe(root,[[-1.5,1.7,-.5],[-1.5,2.43,-.55],[-.86,2.43,-.55]],.14,finish.coldTrim);
  for(const y of [1.83,2.04,2.25])ringY(root,.15,.035,[-1.5,y,-.5],finish.cold);
  pipe(root,[[.95,1.39,-.55],[1.60,1.39,-.55],[1.60,.60,.78],[.82,.60,1.49]],.14,finish.cold);
  for(const y of [.79,1.0,1.21])ringY(root,.155,.027,[1.6,y,-.55],finish.coldTrim);
  box(root,[.52,.79,.65],[1.52,.77,.72],mat.trim);vent(root,[1.52,.77,1.083],.37,.53);lights.push(status(root,[1.5,1.29,1.09],'#a8d3df'));
  const gauge=cyl(root,.17,.17,.045,[.12,2.30,.52],mat.metal,20);gauge.rotation.x=Math.PI/2;const face=cyl(root,.138,.138,.025,[.12,2.30,.558],finish.white,20);face.rotation.x=Math.PI/2;beam(root,[.12,2.30,.58],[.06,2.38,.58],.012,finish.blue);
  cyl(root,.10,.15,.32,[.73,3.37,-.65],mat.metal,16);cyl(root,.17,.17,.08,[.73,3.57,-.65],finish.coldTrim,16);
  const vapor=[];for(let i=0;i<5;i++){const puff=new T.Sprite(new T.SpriteMaterial({map:mistMap(),color:'#dce7ef',transparent:true,opacity:0,depthWrite:false,depthTest:true}));puff.name='working-cold-vapor';root.add(puff);vapor.push(puff);}
  for(let i=0;i<9;i++){const a=i*2.399,crystal=cyl(root,0,.045+(i%3)*.013,.12+(i%3)*.05,[1.58+Math.cos(a)*.14,.65+i*.06,-.55+Math.sin(a)*.14],finish.cold,5);crystal.rotation.z=Math.cos(a)*.3;}
  animate=(a)=>{fan.rotation.z=-phase*3.8;vapor.forEach((puff,i)=>{const f=((phase*.15+i/5)%1+1)%1;puff.position.set(.73+Math.sin(f*3+i)*f*.14,3.62+f*.74,-.65+Math.cos(f*2+i)*f*.13);puff.scale.setScalar(.27+f*.49);puff.material.opacity=Math.sin(f*Math.PI)*.13*a;});};
 }else{
  height=3.82;
  cyl(root,.92,1.12,.55,[0,.64,-.38],mat.trim,32);cyl(root,.80,.87,.35,[0,1.10,-.38],mat.metal,32);ringY(root,1.03,.08,[0,.88,-.38],finish.blue);
  const cage=new T.Group();cage.position.set(0,0,-.38);root.add(cage);
  for(const y of [1.36,3.44])ringY(cage,1.22,.072,[0,y,0],mat.metal);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.sin(a)*1.22,z=Math.cos(a)*1.22;beam(cage,[x,1.36,z],[x,3.44,z],.045,mat.trim);for(const y of [1.58,3.22])sphere(cage,.065,[x,y,z],mat.metal,10);}
  const reactorMaterial=new T.MeshStandardMaterial({color:'#7895a6',emissive:'#aacada',emissiveIntensity:0,roughness:.34,metalness:.50});
  const field=new T.Group();field.position.set(0,2.38,0);cage.add(field);
  for(const [r,y] of [[.77,-.51],[.9,0],[.77,.51]]){ringY(field,r,.078,[0,y,0],mat.metal);ringY(field,r,.027,[0,y+.12,0],reactorMaterial);for(const a of [0,Math.PI])box(field,[.19,.20,.18],[Math.sin(a)*r,y,Math.cos(a)*r],finish.mint);}
  const coreMaterial=new T.MeshStandardMaterial({color:'#7893a3',emissive:'#d5e5ed',emissiveIntensity:0,roughness:.36,metalness:.25});sphere(field,.38,[0,0,0],coreMaterial,20);cyl(cage,.14,.14,1.6,[0,2.38,0],mat.dark,16);
  cyl(root,.56,.80,.21,[0,3.60,-.38],mat.trim,24);ringY(root,.53,.035,[0,3.72,-.38],finish.mint);
  box(root,[.68,1.32,.86],[-1.62,1.08,-.38],mat.trim);const turbine=coolingFan(root,[-1.62,1.12,.095],.30);
  moving.add(field);moving.add(turbine);
  pipe(root,[[-.67,1.1,-.38],[-1.32,1.1,-.38],[-1.62,1.42,-.38]],.085,finish.copper);
  for(const x of [-1.6,1.6]){box(root,[.66,1.25,.23],[x,1.89,-1.69],mat.dark);for(let i=0;i<8;i++)box(root,[.69,.035,.29],[x,1.39+i*.14,-1.68],mat.metal);pipe(root,[[x,1.3,-1.64],[x,1.03,-1.04],[x*.58,1.14,-.69]],.055);}
  pipe(root,[[.74,1.15,-.38],[1.55,1.15,-.38],[1.55,.53,1.47]],.08,finish.mint);lights.push(status(root,[1.45,1.23,2.14],'#b0cdd5'));
  animate=(a)=>{field.rotation.y=phase*.19;turbine.rotation.z=-phase*3.4;reactorMaterial.emissiveIntensity=a*.95;coreMaterial.emissiveIntensity=a*1.15;};
 }
 root.userData.height=height;
 // Set a stable idle pose immediately; no component begins detached or moving.
 animate(0);
 batchStaticParts(root,moving);
 return {root,update(time,activity=0){
  const now=finite(time),dt=previous===null?0:T.MathUtils.clamp(now-previous,0,.25),target=T.MathUtils.clamp(finite(activity),0,1);previous=now;
  blend+=(target-blend)*(1-Math.exp(-dt*6));if(target===0&&blend<.00005)blend=0;
  phase=(phase+dt*blend*2)%(Math.PI*1200);animate(blend);
  for(let i=0;i<lights.length;i++)lights[i].emissiveIntensity=.035+blend*(.35+.02*Math.sin(phase+i));
 }};
}
