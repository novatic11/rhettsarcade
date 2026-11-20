import * as T from './vendor/three.module.js';

// Original orbital hardware. Static details are welded into one indexed mesh
// per finish; small articulated assemblies remain independently animated.
const TAU = Math.PI * 2;
const Y = new T.Vector3(0, 1, 0);
const TYPES = new Set(['core','corridor','elbow','tee','cross','vertical','hub','dock','solar','solarwing','battery','capacitor','fuel','cargo','habitat','greenhouse','lab','observatory','refinery','fabricator','cryoplant','reactor','radiator','comms','antimatter','shipyard']);
const STRUCTURAL = new Set(['core','hub','corridor','elbow','tee','cross','vertical']);
const OMIT_HULL = Object.freeze({cyl(){},ring(){},ball(){}});
const vec = a => new T.Vector3(...a);

function materials() {
  const m = (color, roughness=.65, metalness=.25, extra={}) => new T.MeshStandardMaterial({color,roughness,metalness,...extra});
  return {
    shell:m('#dbe4e8',.58,.08), steel:m('#8898a6',.32,.82), dark:m('#24313e',.74,.22),
    blue:m('#49667d',.54,.22), copper:m('#ab7960',.38,.75), glass:m('#102b46',.20,.42),
    warm:m('#bdcdd8',.38,.05,{emissive:'#b5cddd',emissiveIntensity:.09}),
    green:m('#688878',.89,.01)
  };
}

function merge(geometries) {
  let count=0,indexCount=0;
  for(const g of geometries){count+=g.attributes.position.count;indexCount+=g.index?g.index.count:g.attributes.position.count;}
  const position=new Float32Array(count*3),normal=new Float32Array(count*3),uv=new Float32Array(count*2);
  const index=count>65535?new Uint32Array(indexCount):new Uint16Array(indexCount);
  let vertexOffset=0,indexOffset=0;
  for(const g of geometries){
    const n=g.attributes.position.count;
    position.set(g.attributes.position.array,vertexOffset*3);
    normal.set(g.attributes.normal.array,vertexOffset*3);
    if(g.attributes.uv)uv.set(g.attributes.uv.array,vertexOffset*2);
    if(g.index)for(let i=0;i<g.index.count;i++)index[indexOffset++]=g.index.array[i]+vertexOffset;
    else for(let i=0;i<n;i++)index[indexOffset++]=i+vertexOffset;
    vertexOffset+=n;g.dispose();
  }
  const result=new T.BufferGeometry();
  result.setAttribute('position',new T.BufferAttribute(position,3));
  result.setAttribute('normal',new T.BufferAttribute(normal,3));
  result.setAttribute('uv',new T.BufferAttribute(uv,2));
  result.setIndex(new T.BufferAttribute(index,1));
  result.computeBoundingSphere();
  return result;
}

function builder(parent,palette) {
  const buckets=new Map();
  function add(g,key,p=[0,0,0],rotation=[0,0,0],scale=[1,1,1]) {
    const matrix=new T.Matrix4().compose(vec(p),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),vec(scale));
    g.applyMatrix4(matrix);
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(g);
  }
  const orientation=axis=>axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];
  return {
    add,
    box(s,p,key='shell',r=[0,0,0]){add(new T.BoxGeometry(...s),key,p,r);},
    cyl(r,h,p,key='steel',axis='y',r2=r,n=24){add(new T.CylinderGeometry(r,r2,h,n),key,p,orientation(axis));},
    ring(r,t,p,key='steel',axis='y',segments=40){add(new T.TorusGeometry(r,t,7,segments),key,p,axis==='x'?[0,Math.PI/2,0]:axis==='y'?[Math.PI/2,0,0]:[0,0,0]);},
    ball(r,p,key='shell',scale=[1,1,1]){add(new T.SphereGeometry(r,24,14),key,p,[0,0,0],scale);},
    beam(a,b,r=.08,key='steel'){
      const start=vec(a),end=vec(b),g=new T.CylinderGeometry(r,r,start.distanceTo(end),10);
      const matrix=new T.Matrix4().compose(start.clone().add(end).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(Y,end.sub(start).normalize()),new T.Vector3(1,1,1));
      g.applyMatrix4(matrix);if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(g);
    },
    finish(){for(const [key,geometries]of buckets){const o=new T.Mesh(merge(geometries),palette[key]);o.name=`station-batch-${key}`;o.castShadow=o.receiveShadow=true;parent.add(o);}buckets.clear();}
  };
}

function ribbedVessel(b,{axis='x',radius=2.2,length=7,p=[0,0,0],key='shell',ribs=7}={}) {
  b.cyl(radius,length,p,key,axis,radius,32);
  const along=distance=>p.map((v,i)=>v+(i===(axis==='x'?0:axis==='y'?1:2)?distance:0));
  for(let i=0;i<ribs;i++)b.ring(radius+.012,.052,along(-length*.45+i*length*.9/Math.max(1,ribs-1)),'steel',axis);
  for(const side of [-1,1])b.ball(radius,along(side*length/2),key,axis==='x'?[.27,1,1]:axis==='y'?[1,.27,1]:[1,1,.27]);
}
function servicePanel(b,p=[0,0,2.25],width=1.45,height=1.1) {
  b.box([width,height,.12],p,'dark');
  b.box([width-.16,height-.16,.07],[p[0],p[1],p[2]+.095],'shell');
  for(let i=0;i<4;i++)b.box([width*.58,.045,.035],[p[0],p[1]+height*.25-i*height*.16,p[2]+.15],i===0?'copper':'steel');
}
function radialServicePanel(b,point,width,height) {
  const center=vec(point),normal=center.clone().normalize(),rotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal));
  const transform={box(size,p,key){b.box(size,vec(p).applyEuler(rotation).add(center).toArray(),key,rotation.toArray().slice(0,3));}};
  servicePanel(transform,[0,0,0],width,height);
}
function radialWindow(b,x,y,radius) {
  const point=new T.Vector3(x,y,Math.sqrt(Math.max(.1,radius*radius-x*x-y*y))),normal=point.clone().normalize(),rotation=new T.Euler().setFromQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),normal)).toArray().slice(0,3);
  point.addScaledVector(normal,.035);b.box([.85,.65,.22],point.toArray(),'steel',rotation);
  point.addScaledVector(normal,.16);b.box([.65,.45,.07],point.toArray(),'warm',rotation);
}
function vent(b,p=[0,0,2.4],width=1.6,height=1.2) {
  b.box([width,height,.16],p,'dark');
  for(let i=0;i<6;i++)b.box([width-.16,.055,.08],[p[0],p[1]-height*.36+i*height*.145,p[2]+.11],'steel');
}
function pipe(b,points,r=.075,key='copper'){for(let i=1;i<points.length;i++)b.beam(points[i-1],points[i],r,key);for(let i=1;i<points.length-1;i++)b.ball(r*1.2,points[i],key);}
function truss(b,a,c,width=.75) {
  const av=vec(a),cv=vec(c),dir=cv.clone().sub(av).normalize();
  let side=new T.Vector3().crossVectors(dir,Y);if(side.lengthSq()<.1)side.set(1,0,0);else side.normalize();
  const points=[];for(const sign of [-1,1]){const offset=side.clone().multiplyScalar(sign*width/2);points.push([av.clone().add(offset),cv.clone().add(offset)]);b.beam(points.at(-1)[0].toArray(),points.at(-1)[1].toArray(),.07,'steel');}
  const steps=Math.max(2,Math.ceil(av.distanceTo(cv)/1.1));
  for(let i=0;i<steps;i++){const p=av.clone().lerp(cv,i/steps).addScaledVector(side,(i%2?1:-1)*width/2),q=av.clone().lerp(cv,(i+1)/steps).addScaledVector(side,(i%2?-1:1)*width/2);b.beam(p.toArray(),q.toArray(),.045,'steel');}
}
function windowRow(b,{axis='x',length=5.2,count=5,y=.55,z=2.15,w=.64,h=.65}={}) {
  for(let i=0;i<count;i++){const s=-length/2+i*length/Math.max(1,count-1),p=axis==='x'?[s,y,z]:[z,y,s];
    if(axis==='x'){b.box([w,h,.13],p,'steel');b.box([w-.13,h-.13,.04],[p[0],p[1],p[2]+.09],'warm');}
    else{b.box([.13,h,w],p,'steel');b.box([.04,h-.13,w-.13],[p[0]+.09,p[1],p[2]],'warm');}
  }
}
function tube(b,axis,length=10.8,r=1.45,p=[0,0,0],hull=b) {
  hull.cyl(r,length,p,'shell',axis,r,28);
  const ai=axis==='x'?0:axis==='y'?1:2;
  for(const d of [-length*.36,0,length*.36]){const q=p.slice();q[ai]+=d;hull.ring(r+.01,.065,q,'steel',axis);}
  const a=p.slice(),c=p.slice();a[ai]-=length/2-.08;c[ai]+=length/2-.08;
  const oi=axis==='y'?2:1;a[oi]-=r+.09;c[oi]-=r+.09;b.beam(a,c,.08,'copper');
  if(hull!==b)for(const d of [-length*.32,length*.32]){const start=p.slice(),end=p.slice();start[ai]+=d;end[ai]+=d;start[oi]-=r-.025;end[oi]-=r+.09;b.beam(start,end,.028,'steel');}
}
function instrumentDeck(b,width=7,depth=6,assembled=false) {
  if(assembled){
    // Sparse orbital saddles transfer equipment loads to a pressure-keel.
    // No terrain slab or broad plate remains underneath the assembled module.
    const half=width*.41,side=depth*.30;
    b.cyl(.29,width*.80,[0,-2.67,0],'shell','x',.29,20);
    for(const x of [-width*.31,width*.31]){
      b.ring(.315,.04,[x,-2.67,0],'steel','x');
      for(const z of [-side,side]){b.beam([x,-2.67,0],[x,-1.98,z],.085,'steel');b.box([.44,.17,.42],[x,-1.98,z],'shell');}
    }
    for(const z of [-side,side])truss(b,[-half,-2.30,z],[half,-2.30,z],.42);
    for(const x of [-half,half]){b.beam([x,-2.30,-side],[x,-2.30,side],.065,'steel');b.beam([x,-2.30,-side],[0,-2.67,0],.045,'steel');b.beam([x,-2.30,side],[0,-2.67,0],.045,'steel');}
    pipe(b,[[-half*.88,-2.98,.12],[half*.88,-2.98,.12]],.045,'copper');
    b.box([.62,.32,.45],[0,-2.91,0],'dark');b.box([.25,.08,.045],[0,-2.91,.25],'warm');
    return;
  }
  b.box([width,.35,depth],[0,-2.4,0],'dark');
  for(const x of [-width/2+.2,width/2-.2])b.box([.16,.23,depth],[x,-2.15,0],'steel');
  for(const z of [-depth/2+.2,depth/2-.2])b.box([width,.23,.16],[0,-2.15,z],'steel');
}
export function stationModuleModel(type,{assembled=false}={}) {
  if(!TYPES.has(type))throw new RangeError(`Unknown orbital station module: ${type}`);
  const root=new T.Group(),p=materials(),b=builder(root,p),animations=[];
  root.name=`station-module-${type}`;root.userData.moduleType=type;root.userData.cellSize=12;
  root.userData.assembled=Boolean(assembled);root.userData.pressureHull=STRUCTURAL.has(type);root.userData.hullOmitted=Boolean(assembled)&&STRUCTURAL.has(type);
  const hull=root.userData.hullOmitted?OMIT_HULL:b;
  const moving=(name,position=[0,0,0])=>{const group=new T.Group();group.name=name;group.position.set(...position);root.add(group);return {group,b:builder(group,p)};};
  const finishMoving=(item,fn)=>{item.b.finish();if(fn)animations.push(fn);return item.group;};

  if(['corridor','elbow','tee','cross','vertical'].includes(type)) {
    if(type==='corridor')tube(b,'x',10.8,1.45,[0,0,0],hull);
    else if(type==='vertical')tube(b,'y',10.8,1.45,[0,0,0],hull);
    else{
      hull.ball(1.58,[0,0,0],'shell');
      if(type==='tee'||type==='cross')tube(b,'x',10.8,1.45,[0,0,0],hull);else tube(b,'x',5.4,1.45,[2.7,0,0],hull);
      if(type==='cross')tube(b,'z',10.8,1.45,[0,0,0],hull);else tube(b,'z',5.4,1.45,[0,0,2.7],hull);
    }
    if(type==='vertical'){
      for(const x of [-1.05,1.05])b.beam([x,-4.7,1.13],[x,4.7,1.13],.055,'dark');
      for(let i=0;i<10;i++)b.beam([-1.05,-4.5+i,1.13],[1.05,-4.5+i,1.13],.035,'steel');
      servicePanel(b,[0,0,1.52],.9,1.3);
    }else{
      servicePanel(b,[type==='elbow'?2.8:-2.8,.1,1.48],.9,.75);
      for(const x of [1.7,3.2]){b.box([.65,.44,.08],[x,.46,1.48],'steel');b.box([.49,.28,.035],[x,.46,1.54],'warm');}
    }
  } else if(type==='core'||type==='hub') {
    const r=type==='core'?3.35:3.1;
    if(type==='core'){hull.ball(r,[0,0,0],'shell');for(const axis of ['x','y','z'])hull.ring(r+.02,.1,[0,0,0],'steel',axis);}
    else{hull.cyl(r,4.4,[0,0,0],'shell','y',r,8);hull.ring(r,.14,[0,2.17,0],'steel','y',8);hull.ring(r,.14,[0,-2.17,0],'steel','y',8);}
    for(const axis of ['x','y','z']){
      const i=axis==='x'?0:axis==='y'?1:2;
      for(const side of [-1,1]){const pos=[0,0,0];pos[i]=side*4.15;tube(b,axis,2.5,root.userData.hullOmitted?1.45:1.3,pos,hull);}
    }
    for(const x of [-1.75,1.75])for(const y of [-1.1,1.1]){
      if(root.userData.hullOmitted)radialWindow(b,x,y,r);
      else{b.box([.85,.65,.22],[x,y,type==='core'?2.57:2.9],'steel');b.box([.65,.45,.07],[x,y,type==='core'?2.73:3.05],'warm');}
    }
    pipe(b,[[-2.25,-1.9,2],[-2.25,-2.6,1.5],[0,-3.38,0],[2.25,-2.6,-1.5]],.09);
    if(root.userData.hullOmitted)radialServicePanel(b,type==='core'?[0,2.1,2.65]:[0,1.8,2.55],1.2,.7);
    else servicePanel(b,[0,type==='core'?2.2:1.8,2.18],1.2,.7);
  } else if(type==='dock') {
    // An honest open docking ring: there is no opaque disc across the throat.
    b.ring(3.25,.38,[1.8,0,0],'shell','x');b.ring(3.24,.13,[2.17,0,0],'steel','x');
    b.ring(3.1,.12,[1.38,0,0],'dark','x');
    for(let i=0;i<8;i++){const a=i*TAU/8,y=Math.sin(a)*3.25,z=Math.cos(a)*3.25;
      b.box([.7,.6,.7],[1.85,y,z],i%2?'steel':'blue');
      b.beam([-2.8,Math.sin(a)*1.4,Math.cos(a)*1.4],[1.1,y,z],.11,'steel');
    }
    ribbedVessel(b,{length:2.5,radius:1.35,p:[-3.7,0,0],ribs:3});
    for(const z of [-3.4,3.4]){b.box([1.1,.8,1],[-.4,-2.3,z],'dark');b.box([.75,.4,1.04],[-.4,-2.3,z],'warm');}
    b.box([1.4,.9,2],[-2.4,2.3,0],'shell');vent(b,[-2.4,2.3,1.08],.9,.6);
  } else if(type==='solar'||type==='solarwing') {
    tube(b,'x',10.8,.65);b.cyl(1.2,1,[0,0,0],'shell','y');
    const spread=type==='solarwing'?2.85:2.65,width=type==='solarwing'?4.55:3.8,length=type==='solarwing'?9.4:7.8;
    for(const side of [-1,1]){
      const wing=moving(`tracking-solar-${side}`,[0,0,side*spread]);
      wing.b.box([length,.13,width],[0,0,0],'steel');wing.b.box([length-.2,.025,width-.2],[0,.085,0],'glass');
      wing.b.box([length-.2,.025,width-.2],[0,-.085,0],'blue');
      for(let i=0;i<16;i++)wing.b.box([.025,.025,width-.22],[-length/2+.18+i*(length-.36)/15,.11,0],'steel');
      for(let i=1;i<5;i++)wing.b.box([length-.22,.025,.025],[0,.11,-width/2+i*width/5],'steel');
      for(const x of [-length*.38,length*.38])wing.b.box([.1,.25,width],[x,-.17,0],'dark');
      b.beam([-length*.38,0,0],[-length*.38,0,side*spread],.09,'steel');b.beam([length*.38,0,0],[length*.38,0,side*spread],.09,'steel');
      finishMoving(wing,time=>{wing.group.rotation.x=Math.sin(time*.025)*.07*side;});
    }
    servicePanel(b,[0,.7,.3],1,.65);
  } else if(type==='battery'||type==='capacitor') {
    instrumentDeck(b,7.4,6.8,assembled);
    if(type==='battery'){
      for(const x of [-2.15,0,2.15])for(const z of [-1.8,1.8]){
        b.box([1.72,4.1,2.2],[x,0,z],'shell');b.box([1.6,.28,2.25],[x,1.76,z],'blue');
        for(const y of [-1.3,-.9,-.5,-.1,.3,.7,1.1])b.box([1.77,.065,2.23],[x,y,z],'steel');
        for(const d of [-.48,.48])b.cyl(.14,.27,[x+d,2.16,z],'copper');
      }
      pipe(b,[[-2.63,2.28,-1.8],[-2.63,2.28,1.8],[2.63,2.28,1.8],[2.63,2.28,-1.8]],.075);
    }else{
      for(const x of [-1.9,1.9])for(const z of [-1.5,1.5]){
        ribbedVessel(b,{axis:'y',radius:1.1,length:4.3,p:[x,0,z],key:'blue',ribs:7});
        b.cyl(.3,.55,[x,2.5,z],'copper');
        for(const side of [-1,1])b.ring(.4,.09,[x,side*2.32,z],'shell');
      }
      truss(b,[-3.2,-1.8,-2.8],[3.2,-1.8,-2.8]);
    }
    servicePanel(b,[0,-.2,3],1.3,1.45);
  } else if(type==='fuel') {
    for(const z of [-1.65,1.65])ribbedVessel(b,{radius:1.5,length:7.8,p:[0,0,z],ribs:5});
    for(const x of [-2.65,2.65]){b.box([.26,3.5,7],[x,0,0],'dark');b.beam([x,-1.7,-3],[x,1.7,3],.08,'steel');}
    pipe(b,[[-4.2,-1.2,-1.65],[-4.6,-2,-1.65],[-4.6,-2,1.65],[-4.2,-1.2,1.65]],.13);
    for(const z of [-1.65,1.65]){b.cyl(.25,.7,[-4.75,-1,z],'steel','y');b.ring(.35,.07,[-4.75,-.6,z],'copper');}
    servicePanel(b,[0,0,3.18]);
  } else if(type==='cargo') {
    instrumentDeck(b,8.8,7.6,assembled);
    for(const x of [-2.2,2.2])for(const z of [-1.8,1.8]){
      b.box([3.8,3.5,3.1],[x,-.2,z],'shell');
      b.box([3.86,.15,3.16],[x,1.33,z],'steel');b.box([3.86,.15,3.16],[x,-1.73,z],'steel');
      for(let i=0;i<7;i++)b.box([.11,2.8,3.14],[x-1.55+i*.52,-.2,z],'blue');
      b.box([1.1,.55,.12],[x,.3,z+1.6],'dark');b.box([.72,.12,.05],[x,.3,z+1.69],'copper');
    }
    for(const x of [-4.14,4.14])truss(b,[x,-2,-3.7],[x,2,-3.7]);
  } else if(type==='habitat') {
    ribbedVessel(b,{radius:2.45,length:7.6,ribs:8});
    windowRow(b,{length:5.8,count:6,y:.5,z:2.4,h:.9});
    windowRow(b,{axis:'z',length:1.3,count:2,y:.5,z:3.8,w:.8,h:.7});
    for(const x of [-2.7,2.7])b.box([1.5,.3,2.5],[x,-2.2,1.9],'blue');
    pipe(b,[[-3.7,-1.55,1.8],[-3.7,-2.5,.5],[3.7,-2.5,.5],[3.7,-1.55,1.8]],.09);
    servicePanel(b,[0,-1,2.3]);
  } else if(type==='greenhouse') {
    // Dark glazed shell is intentionally opaque: plants sit on a large viewing
    // terrace behind individual open-frame glazing bays, without alpha overdraw.
    b.box([8.8,.55,6.6],[0,-1.75,0],'shell');b.box([8.4,.16,6.3],[0,-1.39,0],'dark');
    for(const x of [-3.8,-1.9,0,1.9,3.8]){
      b.beam([x,-1.5,-3.1],[x,1.6,-2.2],.075,'steel');b.beam([x,1.6,-2.2],[x,2.8,0],.075,'steel');b.beam([x,2.8,0],[x,1.6,2.2],.075,'steel');b.beam([x,1.6,2.2],[x,-1.5,3.1],.075,'steel');
    }
    b.box([8.5,.08,2.46],[0,2.2,-1.1],'glass',[-.5,0,0]);
    b.box([8.5,.08,2.46],[0,2.2,1.1],'glass',[.5,0,0]);
    b.box([8.8,.16,.16],[0,2.8,0],'shell');
    const crop=moving('hydroponic-crop',[0,-.9,0]);
    for(const z of [-2.1,0,2.1]){
      b.box([7.5,.35,.85],[0,-1.14,z],'shell');b.box([7.2,.1,.62],[0,-.91,z],'dark');
      for(let i=0;i<10;i++){
        const x=-3.2+i*.71;crop.b.beam([x,0,z],[x,.8,z],.025,'green');
        crop.b.add(new T.SphereGeometry(.28,12,8),'green',[x,.55,z],[0,0,0],[1,1.5,.65]);
        crop.b.add(new T.SphereGeometry(.19,12,8),'green',[x,.92,z+.08],[0,0,0],[.8,1.3,1]);
      }
    }
    finishMoving(crop,time=>{crop.group.scale.y=1+Math.sin(time*.6)*.016;});
    b.box([7.8,.13,.16],[0,1.3,0],'warm');
    pipe(b,[[-4,-1.4,-2.6],[-4,-1.4,2.6],[4,-1.4,2.6]],.07);
    const shutter=moving('greenhouse-sunshade',[0,2.9,0]);shutter.b.box([7.8,.08,.7],[0,0,0],'shell');
    finishMoving(shutter,time=>{shutter.group.rotation.x=Math.sin(time*.035)*.08;});
  } else if(type==='lab') {
    ribbedVessel(b,{radius:2.3,length:6.8,ribs:6});windowRow(b,{count:3,length:3.8,z:2.28,h:.8});
    for(const x of [-2.4,2.4])b.box([1.4,1.8,.75],[x,-1.1,2.1],'shell');
    vent(b,[-2.4,-1,2.55],1,1.1);servicePanel(b,[2.4,-1,2.55],1,1.1);
    b.cyl(1.35,.45,[0,2.4,0],'steel');
    const spin=moving('laboratory-centrifuge',[0,2.85,0]);
    spin.b.cyl(.45,.55,[0,0,0],'dark');
    for(let i=0;i<4;i++){const a=i*TAU/4,x=Math.sin(a),z=Math.cos(a);spin.b.beam([0,0,0],[x*1.45,0,z*1.45],.09,'steel');spin.b.cyl(.25,.7,[x*1.45,0,z*1.45],'shell');spin.b.ring(.26,.03,[x*1.45,.2,z*1.45],'copper');}
    finishMoving(spin,(time,activity)=>{spin.group.rotation.y=time*(.06+activity*.65);});
  } else if(type==='observatory') {
    b.cyl(2.65,1.5,[0,-1.8,0],'shell');b.ring(2.66,.13,[0,-1.07,0],'steel');
    for(let i=0;i<4;i++){const a=i*TAU/4;b.beam([Math.sin(a)*1.7,-1.2,Math.cos(a)*1.7],[Math.sin(a)*1.7,.7,Math.cos(a)*1.7],.16,'steel');}
    const scope=moving('tracking-telescope',[0,.5,0]);
    ribbedVessel(scope.b,{axis:'z',radius:1.38,length:5.5,key:'shell',ribs:6});
    scope.b.cyl(1.35,.12,[0,0,3.13],'dark','z');scope.b.cyl(1.13,.05,[0,0,3.225],'glass','z');scope.b.ring(1.4,.08,[0,0,3.22],'steel','z');
    scope.b.box([2.8,.3,.9],[0,-1.4,0],'blue');scope.b.ball(.55,[0,1.38,-1.2],'shell');
    finishMoving(scope,time=>{scope.group.rotation.set(-.27+Math.sin(time*.045)*.12,Math.sin(time*.025)*.2,0);});
    servicePanel(b,[0,-1.65,2.68],1.1,.7);
  } else if(type==='refinery') {
    instrumentDeck(b,8.8,7.8,assembled);
    for(const x of [-2.25,2.25]){
      ribbedVessel(b,{axis:'y',radius:1.35,length:4.8,p:[x,.3,0],ribs:8});
      b.cyl(.35,1.05,[x,3.46,0],'copper');b.cyl(.5,.18,[x,4.05,0],'steel');
      b.box([1.15,.75,.8],[x,-1.4,1.42],'blue');
    }
    pipe(b,[[-2.25,3.2,0],[-2.25,3.7,-1.6],[2.25,3.7,-1.6],[2.25,3.2,0]],.18);
    pipe(b,[[-2.25,-1.8,1.3],[-2.25,-1.8,3],[2.25,-1.8,3],[2.25,-1.8,1.3]],.16);
    vent(b,[0,-.4,3.1],2.1,1.4);
    const gauge=moving('refinery-pump',[0,.2,2.6]);gauge.b.cyl(.6,.3,[0,0,0],'steel','z');gauge.b.box([.65,.09,.08],[0,0,.2],'copper');
    finishMoving(gauge,(time,activity)=>{gauge.group.rotation.z=time*(.1+activity*.8);});
  } else if(type==='fabricator') {
    instrumentDeck(b,8.8,7.2,assembled);
    for(const x of [-3,3]){b.box([.55,6,.7],[x,.5,-1.5],'shell');truss(b,[x,-2,-2.1],[x,3.4,-2.1],.5);}
    b.box([6.6,.6,1.2],[0,3.4,-1.5],'blue');b.box([5.8,.25,1.28],[0,3.85,-1.5],'shell');
    for(const x of [-2.2,2.2])b.box([.3,.35,5.5],[x,-.85,.2],'steel');
    for(let i=0;i<10;i++)b.cyl(.16,4.2,[0,-.6,-2.25+i*.52],'steel','x');
    b.box([2.5,.45,2.2],[0,-.2,.6],'dark');b.cyl(.85,.65,[0,.3,.6],'shell');
    const head=moving('fabrication-gantry',[0,2.35,-1.5]);head.b.box([1.3,1.15,1.35],[0,0,0],'shell');head.b.cyl(.32,.7,[0,-.8,0],'copper');head.b.box([.65,.15,.75],[0,-1.2,0],'dark');
    finishMoving(head,(time,activity)=>{head.group.position.x=Math.sin(time*.7)*1.4*activity;head.group.position.y=2.35-Math.sin(time*.7)*.45*activity;});
    servicePanel(b,[-3,-.2,2.9],1,1.4);
  } else if(type==='cryoplant') {
    instrumentDeck(b,8.2,7.6,assembled);
    for(const x of [-2,2]){
      ribbedVessel(b,{axis:'y',radius:1.45,length:4.7,p:[x,.3,-.3],ribs:5});
      for(const y of [-.7,.2,1.1])b.ring(1.53,.11,[x,y,-.3],'blue');
      b.cyl(.3,.7,[x,3.1,-.3],'steel');
    }
    pipe(b,[[-2,2.8,-.3],[-2,3.4,-2.5],[2,3.4,-2.5],[2,2.8,-.3]],.16,'steel');
    for(const x of [-2,0,2]){b.box([1.3,1.6,.9],[x,-.7,2.2],'blue');vent(b,[x,-.7,2.72],1.1,1.3);}
    const pump=moving('cryogenic-circulator',[0,1,1.8]);pump.b.ring(.75,.12,[0,0,0],'steel','z');
    for(let i=0;i<5;i++){const a=i*TAU/5;pump.b.box([.65,.13,.1],[Math.cos(a)*.35,Math.sin(a)*.35,0],'blue',[0,0,a+.4]);}
    finishMoving(pump,(time,activity)=>{pump.group.rotation.z=time*(.12+activity*1.2);});
  } else if(type==='reactor') {
    instrumentDeck(b,8.4,7.5,assembled);
    b.cyl(1.65,5,[0,.2,0],'dark');
    for(let i=0;i<10;i++){const a=i*TAU/10;b.box([.32,4.4,.75],[Math.sin(a)*1.7,.2,Math.cos(a)*1.7],'shell',[0,a,0]);}
    for(const y of [-2,2.35])b.cyl(2.1,.4,[0,y,0],'steel');
    for(const y of [-1.2,0,1.2])b.ring(2,.16,[0,y,0],'copper');
    for(const x of [-3.05,3.05]){b.box([1.2,4,3],[x,0,0],'shell');vent(b,[x,0,1.59],.9,3.3);pipe(b,[[x,1.7,-1.3],[x,2.9,-1.3],[0,2.9,-1.3]],.11);}
    const rotor=moving('reactor-field-rotor',[0,.2,0]);rotor.b.ring(2.23,.08,[0,0,0],'blue');
    for(let i=0;i<6;i++){const a=i*TAU/6;rotor.b.box([.25,.28,.6],[Math.sin(a)*2.24,0,Math.cos(a)*2.24],'steel',[0,a,0]);}
    finishMoving(rotor,(time,activity)=>{rotor.group.rotation.y=time*(.05+activity*.3);});
    b.cyl(.7,.2,[0,2.65,0],'warm');
  } else if(type==='radiator') {
    b.box([9.8,.75,1.2],[0,0,0],'shell');
    for(const side of [-1,1])for(let i=0;i<8;i++){
      const x=-4.25+i*1.21;b.box([.95,.19,3.9],[x,0,side*2.6],'dark');
      b.box([.82,.045,3.74],[x,.13,side*2.6],'steel');
      for(let j=0;j<7;j++)b.box([.035,.04,3.5],[x-.3+j*.1,.17,side*2.6],'blue');
    }
    for(const z of [-.7,.7])pipe(b,[[-4.7,.4,z],[4.7,.4,z]],.1,'copper');
    for(const x of [-3.6,0,3.6])b.cyl(.22,.4,[x,.6,0],'steel');
  } else if(type==='comms') {
    ribbedVessel(b,{axis:'y',radius:1.9,length:2.5,p:[0,-1.6,0],ribs:4});
    truss(b,[0,-.2,0],[0,2.1,0],.7);
    const dish=moving('tracking-communications-dish',[0,1.9,0]);
    dish.group.scale.setScalar(.85);
    const profile=[];for(let i=0;i<=12;i++){const r=i/12*2.8;profile.push(new T.Vector2(r,(r*r)*.13));}
    // A double-surface rimmed solid has separately offset front/back profiles.
    for(let i=12;i>=0;i--){const r=i/12*2.8;profile.push(new T.Vector2(r,(r*r)*.13-.08));}
    dish.b.add(new T.LatheGeometry(profile,40),'shell',[0,0,0]);dish.b.ring(2.8,.06,[0,1.02,0],'steel');
    for(let i=0;i<3;i++){const a=i*TAU/3;dish.b.beam([Math.sin(a)*2.55,.85,Math.cos(a)*2.55],[0,2.2,0],.045,'steel');}
    dish.b.cyl(.2,.55,[0,2.15,0],'copper');
    finishMoving(dish,time=>{dish.group.rotation.set(.45+Math.sin(time*.025)*.12,Math.sin(time*.02)*.3,0);});
    for(const x of [-2.6,2.6]){b.beam([x,-1.2,0],[x,2.2,0],.035,'steel');for(let i=0;i<5;i++)b.beam([x-.45,.2+i*.35,0],[x+.45,.2+i*.35,0],.025,'steel');}
    servicePanel(b,[0,-1.5,1.98],1.3,1.1);
  } else if(type==='antimatter') {
    instrumentDeck(b,8.6,8.6,assembled);
    for(const x of [-3.1,3.1])for(const z of [-3.1,3.1])b.beam([x,-2.2,z],[x,2.5,z],.13,'shell');
    for(const y of [-2.15,2.5]){b.ring(3.3,.15,[0,y,0],'steel');for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4;b.beam([Math.sin(a)*4.38,y,Math.cos(a)*4.38],[Math.sin(a)*3.3,y,Math.cos(a)*3.3],.12,'steel');}}
    for(let i=0;i<3;i++){
      const g=moving(`containment-ring-${i}`);g.b.ring(2.1+i*.23,.16,[0,0,0],i===1?'copper':'steel');
      for(let j=0;j<6;j++){const a=j*TAU/6;g.b.box([.32,.35,.45],[Math.sin(a)*(2.1+i*.23),0,Math.cos(a)*(2.1+i*.23)],'blue',[0,a,0]);}
      finishMoving(g,(time,activity)=>{g.group.rotation.set(i*.72+time*(.06+activity*.7),i*.9,time*(i%2?-.18:.14)*(1+activity));});
    }
    p.warm.color.set('#e0eaf0');p.warm.emissive.set('#c1d6e1');
    b.ball(.35,[0,0,0],'warm');b.cyl(.26,.8,[0,-.8,0],'steel');
    servicePanel(b,[0,-1.65,4.1],1.6,.9);
  } else if(type==='shipyard') {
    // Open trussed dry dock with a translating fabrication carriage. Geometry
    // stays within a cell; the actual docking target is owned by the scene.
    for(const y of [-3.65,3.65])for(const z of [-3.65,3.65])truss(b,[-4.8,y,z],[4.8,y,z],.55);
    for(const x of [-4.8,0,4.8]){
      for(const z of [-3.65,3.65])b.beam([x,-3.65,z],[x,3.65,z],.16,'shell');
      for(const y of [-3.65,3.65])b.beam([x,y,-3.65],[x,y,3.65],.16,'shell');
    }
    for(const z of [-3.35,3.35])b.box([9.5,.5,1],[0,-3.55,z],'blue');
    const arm=moving('shipyard-fabrication-carriage',[0,3.25,0]);
    arm.b.box([.6,.6,6.3],[0,0,0],'steel');arm.b.box([1.4,.9,1.3],[0,-.6,0],'shell');
    arm.b.cyl(.22,1.2,[0,-1.5,0],'copper');arm.b.box([.85,.35,.85],[0,-2.2,0],'dark');
    for(const x of [-.4,.4])arm.b.beam([x,-2.2,0],[x*1.4,-2.7,0],.07,'steel');
    finishMoving(arm,(time,activity)=>{arm.group.position.x=Math.sin(time*.2)*3.1*activity;});
    b.box([2.3,2,1.5],[-3,-2.4,4.3],'shell');vent(b,[-3,-2.4,5.12],1.6,1.4);
  }

  b.finish();
  let disposed=false;
  root.updateMatrixWorld(true);
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  root.userData.drawCalls=meshes.length;
  root.userData.vertices=meshes.reduce((n,o)=>n+o.geometry.attributes.position.count,0);
  return {
    root,
    update(time,activity=0){
      if(disposed)return;
      const t=Number.isFinite(time)?time:0,a=T.MathUtils.clamp(Number.isFinite(activity)?activity:0,0,1);
      for(const animate of animations)animate(t,a);
      p.warm.emissiveIntensity=.09+a*.13;
    },
    dispose(){
      if(disposed)return;disposed=true;
      const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
      for(const geometry of geometries)geometry.dispose();
      for(const material of Object.values(p))material.dispose();
      root.removeFromParent();
    }
  };
}
