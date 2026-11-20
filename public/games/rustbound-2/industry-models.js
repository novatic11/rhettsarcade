import * as T from './vendor/three.module.js';
import {box,beam,cyl,mesh,mat} from './models.js';

// Physical seams, raised collars and inset components avoid coplanar overlays.
const makeMaterial=(color,roughness=.7,metalness=.3)=>new T.MeshStandardMaterial({color,roughness,metalness});
const finish={white:makeMaterial('#dbe4e8',.58,.08),steel:makeMaterial('#8898a6',.32,.82),
 blue:makeMaterial('#49667d',.54,.22),orange:makeMaterial('#b57e5f',.56,.20),
 amber:makeMaterial('#bc925c',.55,.12),bus:makeMaterial('#ab7960',.38,.75),
 mint:makeMaterial('#88aeb2',.60,.12),screen:makeMaterial('#102b46',.20,.42)};
const portColors={power:'#84b7ae',solid:'#c49a62',gas:'#7ea9cf',fuel:'#cf8d62'};
const portMaterials=Object.fromEntries(Object.entries(portColors).map(([key,color])=>[key,new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.055,roughness:.44,metalness:.15})]));
const finite=x=>Number.isFinite(x)?x:0;
const activityValue=x=>T.MathUtils.clamp(finite(x),0,1);
function ring(parent,r,t,p,m=mat.metal){return mesh(new T.TorusGeometry(r,t,7,32),m,parent,p);}
function ringY(parent,r,t,p,m=mat.metal){const o=ring(parent,r,t,p,m);o.rotation.x=Math.PI/2;return o;}
function pipe(parent,points,r=.045,m=mat.metal){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,6,false),m,parent);}
function base(parent,w,d){box(parent,[w,.20,d],[0,.10,0],mat.dark);box(parent,[w-.14,.045,d-.14],[0,.227,0],finish.steel);}
function bolts(parent,points,r=.032){
 const o=new T.Object3D(),heads=new T.InstancedMesh(new T.CylinderGeometry(r,r,.026,6),mat.metal,points.length);o.rotation.x=Math.PI/2;
 points.forEach((p,i)=>{o.position.set(...p);o.updateMatrix();heads.setMatrixAt(i,o.matrix);});heads.castShadow=true;heads.receiveShadow=true;parent.add(heads);return heads;
}
function vent(parent,p,w=.7,h=.5,rotation=0){const group=new T.Group();group.position.set(...p);group.rotation.y=rotation;parent.add(group);box(group,[w,h,.07],[0,0,0],mat.dark);for(let i=0;i<6;i++)box(group,[w-.1,.027,.055],[0,-h*.35+i*h*.14,.07],mat.metal);return group;}
function lamp(parent,p,color='#b5cdd9'){
 const material=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.05,roughness:.38,metalness:.05});box(parent,[.15,.085,.065],p,material);return material;
}
function valve(parent,p,r=.15){
 const group=new T.Group();group.position.set(...p);parent.add(group);ring(group,r,.025,[0,0,0],finish.blue);beam(group,[-r,0,0],[r,0,0],.016,finish.blue);beam(group,[0,-r,0],[0,r,0],.016,finish.blue);cyl(group,.042,.042,.10,[0,0,-.075],mat.metal,12).rotation.x=Math.PI/2;return group;
}
function panel(parent,p,w,h){box(parent,[w,h,.06],p,mat.trim);box(parent,[w-.10,h-.1,.028],[p[0],p[1],p[2]+.051],finish.white);bolts(parent,[-1,1].flatMap(x=>[-1,1].map(y=>[p[0]+x*(w/2-.065),p[1]+y*(h/2-.065),p[2]+.077])),.022);}
function horizontalVessel(parent,p,r,len){
 const g=new T.Group();g.position.set(...p);parent.add(g);const vessel=mesh(new T.CapsuleGeometry(r,len,6,24),finish.white,g);vessel.rotation.x=Math.PI/2;
 for(const z of [-len*.37,len*.37])ring(g,r+.018,.045,[0,0,z],mat.metal);
  for(const z of [-len*.38,len*.38]){box(g,[r*1.65,.24,.30],[0,-r*.86,z],mat.metal);beam(g,[-r*.64,-r*.86,z],[-r*.64,.25-p[1],z],.06);beam(g,[r*.64,-r*.86,z],[r*.64,.25-p[1],z],.06);}
 return g;
}

/** Raised wall jack: mount against local z=0; the connector faces +Z. */
export function portModel(kind,direction='io'){
 if(!Object.hasOwn(portColors,kind))throw new RangeError(`Unknown industry port: ${kind}`);
 if(!['in','out','io'].includes(direction))throw new RangeError(`Unknown port direction: ${direction}`);
 const root=new T.Group();root.name=`port-${kind}-${direction}`;root.userData.portKind=kind;root.userData.direction=direction;
 box(root,[.42,.57,.055],[0,-.045,.029],mat.dark);box(root,[.37,.51,.025],[0,-.045,.077],mat.trim);
 const collar=cyl(root,.155,.17,.11,[0,.02,.141],mat.metal,20);collar.rotation.x=Math.PI/2;
 const socket=cyl(root,.117,.117,.024,[0,.02,.202],mat.dark,20);socket.rotation.x=Math.PI/2;
 ring(root,.139,.025,[0,.02,.217],portMaterials[kind]);bolts(root,[[-.157,.176,.104],[.157,.176,.104],[-.157,-.256,.104],[.157,-.256,.104]],.021);
 for(const x of [-.045,.045]){const pin=cyl(root,.012,.012,.025,[x,.02,.224],mat.gold,8);pin.rotation.x=Math.PI/2;}
 const arrow=(x,orientation)=>{const o=mesh(new T.ConeGeometry(.035,.089,3),portMaterials[kind],root,[x,-.212,.136]);o.rotation.z=orientation==='in'?0:Math.PI;};
 if(direction==='io'){arrow(-.052,'in');arrow(.052,'out');}else arrow(0,direction);
 root.userData.connectorDepth=.243;return root;
}

export function industryBuildingModel(type){
 const root=new T.Group();root.name=`industry-${type}`;root.userData.building=type;
 const lamps=[];let radius=3,height=3,animate=()=>{},phase=0,previous=null,blend=0;
 if(type==='gaswell'){
  radius=2.8;height=4.34;base(root,3.8,3.65);
  // Subsurface wellhead and compact service derrick.
  cyl(root,.61,.79,.28,[0,.41,0],mat.metal,24);cyl(root,.31,.36,1.06,[0,1.06,0],finish.blue,24);
  for(const y of [.66,1.04,1.52])ringY(root,.34,.035,[0,y,0]);
  for(const x of [-1.34,1.34])for(const z of [-1.17,1.17]){
   cyl(root,.28,.34,.13,[x,.315,z],mat.dark,16);beam(root,[x,.40,z],[x*.57,4.22,z*.28],.072,mat.trim);
   beam(root,[x,.80,z],[x*.65,3.7,-z*.24],.031,mat.metal);
  }
  box(root,[1.87,.24,1.0],[0,4.21,0],mat.metal);cyl(root,.15,.15,2.4,[0,2.92,0],mat.metal,16);
  const head=new T.Group();head.position.y=3.74;root.add(head);box(head,[.61,.63,.58],[0,0,0],finish.white);cyl(head,.21,.21,.20,[0,-.41,0],mat.dark,16);
  const pump=new T.Group();pump.position.set(-1.23,1.05,.70);root.add(pump);cyl(pump,.36,.36,.76,[0,0,0],mat.metal,20).rotation.x=Math.PI/2;
  const flywheel=ring(pump,.32,.047,[0,0,.49],finish.blue);for(const a of [0,Math.PI/2]){const spoke=box(flywheel,[.55,.04,.04],[0,0,0],mat.metal);spoke.rotation.z=a;}
  pipe(root,[[0,1.16,.23],[0,1.16,.91],[1.1,1.16,.91],[1.1,.58,1.38]],.11,finish.blue);for(const x of [.2,.9])valve(root,[x,1.2,1.12],.13);
  pipe(root,[[-1.23,1.05,.32],[-1.23,.60,-.58],[0,.60,-.42]],.07,mat.dark);
  box(root,[.8,.88,.57],[1.18,.76,-.7],mat.trim);panel(root,[1.18,.78,-.382],.66,.59);lamps.push(lamp(root,[1.17,1.16,-.32]));
  bolts(root,[[-.35,.55,.59],[.35,.55,.59],[-.35,.33,.59],[.35,.33,.59]]);
  animate=(time,a)=>{head.position.y=3.74+Math.sin(phase)*.075*a;flywheel.rotation.z=-phase*.8;};
 }else if(type==='refueler'){
  radius=3;height=3.30;base(root,4.25,3.7);
  for(const x of [-1.03,1.03]){const tank=horizontalVessel(root,[x,1.29,-.35],.61,1.35);for(const z of [-.38,.38])ring(tank,.63,.035,[0,0,z],finish.orange);pipe(root,[[x,1.85,-.7],[x,2.15,-.7],[0,2.15,-.7]],.055);}
  box(root,[1.2,1.03,.82],[0,.80,1.18],mat.trim);panel(root,[0,.85,1.626],.99,.73);vent(root,[0,.71,1.70],.66,.30);lamps.push(lamp(root,[.35,1.1,1.74],'#cfaa7c'));
  const separator=cyl(root,.30,.31,1.21,[0,2.51,-.7],mat.trim,20);ringY(root,.32,.025,[0,2.15,-.7]);ringY(root,.32,.025,[0,2.91,-.7]);cyl(root,.16,.20,.18,[0,3.205,-.7],mat.metal,16);
  const reel=new T.Group();reel.position.set(-1.23,1.01,1.23);root.add(reel);for(const z of [-.21,.21]){cyl(reel,.44,.44,.055,[0,0,z],mat.metal,24).rotation.x=Math.PI/2;}cyl(reel,.22,.22,.35,[0,0,0],mat.dark,20).rotation.x=Math.PI/2;
  for(let i=0;i<5;i++)ring(reel,.34,.035,[0,0,-.145+i*.073],mat.rubber);
  for(const x of [-1.47,-.99])beam(root,[x,.30,1.24],[x,1.02,1.24],.045,mat.trim);
  pipe(root,[[-1.22,.99,1.46],[-.90,.41,1.65],[.46,.39,1.57],[1.43,.76,1.44]],.042,mat.rubber);
  box(root,[.18,.34,.20],[1.43,.95,1.44],finish.orange);beam(root,[1.43,1.07,1.44],[1.43,1.21,1.23],.03,mat.metal);box(root,[.30,.09,.25],[1.43,.70,1.44],mat.dark);
  pipe(root,[[-1.03,.85,-.8],[-1.03,.47,-1.05],[1.03,.47,-1.05],[1.03,.85,-.8]],.06,finish.blue);
  const gauge=ring(root,.16,.025,[.84,2.0,.58],mat.metal);const dial=cyl(root,.15,.15,.025,[.84,2,.57],finish.white,20);dial.rotation.x=Math.PI/2;const needle=beam(root,[.84,2,.60],[.9,2.09,.60],.012,mat.dark);
  animate=(time,a)=>{reel.rotation.z=Math.sin(time*.25)*.025*a;needle.rotation.z=Math.sin(time*.7)*.04*a;};
 }else if(type==='battery'){
  radius=2.8;height=2.87;base(root,3.8,3.7);
  for(const x of [-.88,.88])for(const z of [-.81,.81]){
   box(root,[1.47,2.10,1.35],[x,1.37,z],finish.white);box(root,[1.31,.14,1.19],[x,2.50,z],mat.trim);
   for(const yy of [.60,1.2,1.8])box(root,[1.51,.045,1.39],[x,yy,z],mat.metal);
   const front=z>0?1.518:-1.518,g=new T.Group();g.position.set(x,1.36,front);if(z<0)g.rotation.y=Math.PI;root.add(g);
   panel(g,[0,0,0],1.05,1.2);box(g,[.58,.16,.035],[0,.22,.101],finish.blue);vent(g,[0,-.24,.10],.69,.36);
   lamps.push(lamp(g,[.35,.43,.107]));
   for(const xx of [-.29,.29]){cyl(root,.075,.075,.19,[x+xx,2.67,z],mat.metal,12);ringY(root,.078,.012,[x+xx,2.71,z],xx<0?finish.blue:finish.orange);}
  }
  for(const x of [-1.7,1.7])for(const z of [-1.63,1.63])beam(root,[x,.27,z],[x,2.7,z],.065,mat.metal);
  for(const z of [-1.63,1.63])beam(root,[-1.7,2.73,z],[1.7,2.73,z],.06,mat.trim);
  for(const x of [-1.17,-.59,.59,1.17])box(root,[.085,.065,1.64],[x,2.83,0],finish.bus);
  box(root,[.6,.57,.4],[0,1.0,1.66],mat.trim);box(root,[.40,.30,.045],[0,1.06,1.895],mat.dark);beam(root,[0,.92,1.94],[.07,1.17,1.94],.022,finish.mint);
  animate=()=>{};
 }else if(type==='reservoir'){
  radius=3;height=4.04;base(root,4.1,4.1);
  const profile=[[0,.48],[.72,.48],[1.20,.64],[1.48,1.03],[1.5,1.26],[1.5,2.94],[1.44,3.24],[1.16,3.55],[.65,3.74],[0,3.77]].map(a=>new T.Vector2(...a));mesh(new T.LatheGeometry(profile,48),finish.white,root);
  for(const y of [1.15,2.13,3.02])ringY(root,1.515,.04,[0,y,0],mat.metal);ringY(root,1.518,.064,[0,2.62,0],finish.blue);
  for(const x of [-1.18,1.18])for(const z of [-1.18,1.18]){beam(root,[x,.27,z],[x,1.1,z],.08);box(root,[.43,.07,.43],[x,.285,z],mat.metal);}
  cyl(root,.18,.18,.21,[0,3.875,0],mat.metal,16);cyl(root,.27,.27,.07,[0,4.0,0],finish.blue,20);
  for(const x of [-.32,.32])beam(root,[x,.31,1.68],[x,3.48,1.68],.035,mat.metal);for(let y=.50;y<3.4;y+=.32)beam(root,[-.32,y,1.69],[.32,y,1.69],.032,mat.trim);
  pipe(root,[[1.31,1.08,.27],[1.77,1.08,.27],[1.77,.58,1.28],[1.36,.58,1.44]],.11,finish.blue);valve(root,[1.77,1.12,.47],.17);
  box(root,[.43,.62,.13],[-.74,1.77,1.41],mat.trim);box(root,[.25,.44,.05],[-.74,1.77,1.51],finish.screen);for(let i=0;i<4;i++)box(root,[.17,.035,.025],[-.74,1.62+i*.10,1.55],finish.mint);
  lamps.push(lamp(root,[-.74,2.18,1.41]));
 }else if(type==='exporter'){
  radius=3;height=3.54;base(root,4.2,3.85);
  cyl(root,1.02,1.13,.18,[-.43,.35,-.38],mat.metal,32);ringY(root,.86,.045,[-.43,.465,-.38],finish.amber);
  // Sealed cargo canister, with a small propulsion skirt and service gantry.
  const cargo=new T.Group();cargo.position.set(-.43,.50,-.38);root.add(cargo);
  cyl(cargo,.60,.63,1.8,[0,1.36,0],finish.white,32);cyl(cargo,.46,.60,.35,[0,2.44,0],mat.trim,24);cyl(cargo,.47,.47,.13,[0,2.70,0],mat.metal,24);
  for(const y of [.55,1.45,2.25])ringY(cargo,.64,.037,[0,y,0],mat.metal);for(const x of [-.40,.40])for(const z of [-.40,.40])box(cargo,[.08,1.59,.08],[x,1.37,z],mat.metal);
  cyl(cargo,.28,.40,.38,[0,.28,0],mat.dark,20);for(const a of [0,Math.PI*.5,Math.PI,Math.PI*1.5]){const brace=box(cargo,[.10,.40,.22],[Math.sin(a)*.55,.37,Math.cos(a)*.55],finish.amber);brace.rotation.y=a;}
  for(const x of [-1.65,.8]){beam(root,[x,.3,-1.31],[x,3.45,-1.31],.07,mat.trim);beam(root,[x,.35,-1.31],[x,1.8,-.86],.05);}
  beam(root,[-1.65,3.45,-1.31],[.8,3.45,-1.31],.09,mat.metal);
  const service=new T.Group();service.position.set(-.43,2.2,-1.31);root.add(service);box(service,[1.2,.27,.43],[0,0,0],mat.trim);for(const x of [-.5,.5])beam(service,[x,0,.15],[x,0,.55],.045,mat.metal);
  box(root,[1.21,1.3,.96],[1.19,.95,.79],mat.trim);vent(root,[1.2,.87,1.31],.91,.65);lamps.push(lamp(root,[1.2,1.62,1.32]));
  const mast=new T.Group();mast.position.set(1.15,1.64,.75);root.add(mast);cyl(mast,.07,.12,1.15,[0,.5,0],mat.metal,16);
  const scanner=new T.Group();scanner.position.y=1.11;scanner.rotation.x=-.62;mast.add(scanner);
  const dishPoints=[[0,0],[.17,.02],[.35,.09],[.53,.23],[.59,.29]].map(a=>new T.Vector2(...a));mesh(new T.LatheGeometry(dishPoints,24),new T.MeshStandardMaterial({color:'#b4c3cf',roughness:.44,metalness:.62,side:T.DoubleSide}),scanner);ringY(scanner,.59,.024,[0,.29,0]);beam(scanner,[0,.02,0],[0,.73,0],.019);cyl(scanner,.055,.055,.09,[0,.75,0],mat.dark,12);
  pipe(root,[[1.15,1.8,.74],[1.8,1.3,.72],[1.8,.38,-.2],[.72,.38,-.75]],.04,mat.rubber);
  for(let i=0;i<5;i++)box(root,[.28,.02,.11],[-1.3+i*.36,.26,1.45],finish.amber);
  animate=(time,a)=>{mast.rotation.y=Math.sin(time*.12)*.5;service.position.y=2.2+Math.sin(phase*.5)*.09*a;};
 }else throw new RangeError(`Unknown industry building: ${type}`);
 root.userData.footprintRadius=radius;root.userData.height=height;
 return {root,update(time,activity=0){
  const now=finite(time),dt=previous===null?0:T.MathUtils.clamp(now-previous,0,.25);previous=now;
  blend+=(activityValue(activity)-blend)*(1-Math.exp(-dt*5));phase+=dt*(.15+blend*3.8);
  animate(now,blend);lamps.forEach((m,i)=>{m.emissiveIntensity=.05+blend*(.34+.025*Math.sin(now*1.7-i));});
 }};
}
