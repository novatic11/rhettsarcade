import * as T from './vendor/three.module.js';
import {box,beam,cyl,mesh} from './models.js';

function roverMaterials(){
 const m=(color,roughness,metalness,extra={})=>new T.MeshStandardMaterial({color,roughness,metalness,...extra});
 return {
  trim:m('#dbe4e8',.48,.14), metal:m('#667c8b',.27,.88),
  frame:m('#8fa6b5',.38,.75), dark:m('#213648',.57,.42),
  rubber:m('#101a24',.89,.03), amber:m('#d6a25d',.45,.2),
  glass:m('#061c35',.065,.92,{envMapIntensity:1.3}),
  light:m('#c3e0ee',.3,.1,{emissive:'#8eb6cf',emissiveIntensity:.35})
 };
}

function batchHardware(scope,excluded=[]){
 const exclude=new Set(excluded),buckets=new Map();
 scope.updateWorldMatrix(true,true);
 const inverse=new T.Matrix4().copy(scope.matrixWorld).invert();
 function collect(object){
  if(exclude.has(object))return;
  if(object.isMesh){
   const list=buckets.get(object.material)||[];list.push(object);buckets.set(object.material,list);
  }
  for(const child of object.children)collect(child);
 }
 for(const child of scope.children)collect(child);
 for(const [material,objects]of buckets){
  if(objects.length<2)continue;
  const geometries=objects.map(object=>object.geometry.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld)));
  const vertices=geometries.reduce((n,g)=>n+g.attributes.position.count,0),indexCount=geometries.reduce((n,g)=>n+(g.index?.count||g.attributes.position.count),0);
  const positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),uv=new Float32Array(vertices*2),indices=vertices>65535?new Uint32Array(indexCount):new Uint16Array(indexCount);
  let offset=0,indexOffset=0;
  for(const g of geometries){
   const count=g.attributes.position.count;
   positions.set(g.attributes.position.array,offset*3);normals.set(g.attributes.normal.array,offset*3);
   if(g.attributes.uv)uv.set(g.attributes.uv.array,offset*2);
   for(let i=0;i<(g.index?.count||count);i++)indices[indexOffset++]=(g.index?g.index.array[i]:i)+offset;
   offset+=count;g.dispose();
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('normal',new T.BufferAttribute(normals,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.setIndex(new T.BufferAttribute(indices,1));geometry.computeBoundingSphere();
  for(const object of objects){object.removeFromParent();object.geometry.dispose();}
  const combined=new T.Mesh(geometry,material);combined.name='batched-rover-hardware';combined.castShadow=combined.receiveShadow=true;scope.add(combined);
 }
}

export function roverModel(){
 const root=new T.Group(),chassis=new T.Group(),mat=roverMaterials();root.name='surface-expedition-rover';root.add(chassis);
 box(chassis,[1.8,.14,2.95],[0,.78,0],mat.metal);
 for(const x of [-.85,.85])beam(chassis,[x,.62,-1.5],[x,.62,1.5],.075,mat.frame);
 for(const z of [-1.25,0,1.25])beam(chassis,[-.94,.62,z],[.94,.62,z],.065,mat.metal);
 // Broad ceramic side guards make the chassis readable against dark terrain.
 // Their outer edge stays inside the original wheel envelope.
 for(const x of [-.88,.88]){
  box(chassis,[.105,.22,1.76],[x,.79,0],mat.trim);
  box(chassis,[.116,.07,.22],[x,.79,-.64],mat.amber);
 }
 for(const x of [-.42,.42]){
  box(chassis,[.65,.13,.65],[x,1.02,.35],mat.rubber);
  const back=box(chassis,[.65,.76,.13],[x,1.4,.70],mat.dark);back.rotation.x=-.12;
  for(const y of [1.1,1.65])beam(chassis,[x-.35,y,.82],[x+.35,y,.82],.04,mat.trim);
  beam(chassis,[x-.32,1.05,.8],[x-.32,1.74,.9],.035,mat.frame);
  beam(chassis,[x+.32,1.05,.8],[x+.32,1.74,.9],.035,mat.frame);
 }
 box(chassis,[1.5,.20,.65],[0,.96,-1.02],mat.trim);
 box(chassis,[1.44,.05,.59],[0,1.08,-1.02],mat.dark);
 for(let i=0;i<8;i++)box(chassis,[1.3,.018,.028],[0,1.115,-1.28+i*.075],mat.frame);
 beam(chassis,[-.9,.85,-1.53],[.9,.85,-1.53],.07,mat.trim);
 const wheel=new T.Group();wheel.name='rover-steering-wheel';wheel.position.set(-.42,1.40,-.35);chassis.add(wheel);
 const ring=mesh(new T.TorusGeometry(.20,.025,8,24),mat.dark,wheel);ring.rotation.x=Math.PI*.25;
 beam(chassis,[-.42,.95,-.1],[-.42,1.4,-.35],.035,mat.metal);
 box(chassis,[.3,.10,.27],[.45,1.16,-.96],mat.dark);
 // A single recessed dark-blue display, rather than a bank of bright dots.
 box(chassis,[.22,.012,.19],[.45,1.219,-.96],mat.glass);
 box(chassis,[.15,.007,.012],[.45,1.229,-1.005],mat.light);
 const wheels=[];
 for(const x of [-1.08,1.08])for(const z of [-1.15,1.15]){
  beam(root,[x*.65,.66,z],[x,.43,z],.05,mat.metal);
  const steer=new T.Group();steer.name='rover-steering-knuckle';steer.position.set(x,.45,z);root.add(steer);
  const spin=new T.Group();spin.name='rover-wheel';steer.add(spin);
  const tire=cyl(spin,.45,.45,.31,[0,0,0],mat.rubber,32);tire.rotation.z=Math.PI/2;
  for(const out of [-.17,.17]){
   const hub=cyl(spin,.23,.23,.025,[out,0,0],mat.metal,24);hub.rotation.z=Math.PI/2;
   const cap=cyl(spin,.105,.105,.022,[out+Math.sign(out)*.025,0,0],mat.trim,20);cap.rotation.z=Math.PI/2;
  }
  for(let i=0;i<20;i++){
   const a=i/20*Math.PI*2,tread=box(spin,[.34,.045,.11],[0,Math.cos(a)*.45,Math.sin(a)*.45],mat.dark);tread.rotation.x=a;
  }
  wheels.push({steer,spin,front:z<0});
 }
 for(const x of [-.68,.68]){
  box(chassis,[.20,.14,.045],[x,.99,-1.53],mat.dark);
  box(chassis,[.14,.085,.015],[x,.99,-1.56],mat.light);
 }
 box(chassis,[1.4,.14,.5],[0,.98,1.28],mat.trim);
 for(const z of [1.08,1.48])beam(chassis,[-.78,1.15,z],[.78,1.15,z],.025,mat.frame);
 const cargo=new T.Group();cargo.name='rover-cargo';cargo.position.set(0,1.1,1.12);chassis.add(cargo);
 box(cargo,[1.12,.65,.55],[0,.32,0],mat.trim);
 for(const x of [-.36,.36])box(cargo,[.07,.69,.59],[x,.32,0],mat.dark);
 box(cargo,[.40,.12,.018],[0,.39,.29],mat.metal);
 box(cargo,[.18,.05,.012],[0,.39,.307],mat.amber);cargo.visible=false;
 const lamps=[];
 for(const x of [-.68,.68]){
  const light=new T.SpotLight('#c9e1f2',30,45,.45,.55,1.6);light.position.set(x,1.02,-1.5);
  const target=new T.Object3D();target.position.set(x,.1,-30);root.add(light,target);light.target=target;lamps.push(light);
 }
 // Keep suspension, steering, wheel spin and payload visibility articulated.
 // Everything else becomes one indexed draw per finish in its local frame.
 batchHardware(root,[chassis,...wheels.map(w=>w.steer)]);
 batchHardware(chassis,[wheel,cargo]);
 batchHardware(cargo);
 for(const w of wheels)batchHardware(w.spin);
 let drawCalls=0,vertices=0;root.traverse(o=>{if(o.isMesh){drawCalls++;vertices+=o.geometry.attributes.position.count;}});
 root.userData.drawCalls=drawCalls;root.userData.vertices=vertices;
 let disposed=false;
 return {
  root,
  update(dt,state={}){
   if(disposed)return;
   const roll=Number.isFinite(state.roll)?state.roll:0,speed=Number.isFinite(state.speed)?state.speed:0,odometer=Number.isFinite(state.odometer)?state.odometer:0,steering=Number.isFinite(state.steering)?state.steering:0;
   cargo.visible=(state.payload||0)>1;lamps.forEach(light=>light.visible=!!state.night);
   chassis.rotation.z=roll;chassis.position.y=Math.sin(odometer*4)*Math.min(.018,Math.abs(speed)*.002);
   for(const w of wheels){w.steer.rotation.y=w.front?-steering:0;w.spin.rotation.x=-odometer/.45;}
   wheel.rotation.y=-steering*.7;
  },
  dispose(){
   if(disposed)return;disposed=true;
   const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
   for(const geometry of geometries)geometry.dispose();for(const material of Object.values(mat))material.dispose();
   for(const lamp of lamps)lamp.dispose();root.removeFromParent();
  }
 };
}
