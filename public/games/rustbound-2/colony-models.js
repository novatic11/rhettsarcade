import * as T from './vendor/three.module.js';
import {box,beam,cyl,mesh,mat} from './models.js';

// Original colony hardware. The geometry has physical relief instead of
// coplanar decals, so panels remain stable when viewed from low angles.
const Y=new T.Vector3(0,1,0),V=a=>new T.Vector3(...a);
const material=(color,roughness=.75,metalness=.15)=>new T.MeshStandardMaterial({color,roughness,metalness});
// Ceramic insulation, brushed titanium and coated graphite read separately
// under both a hard sun and the station's softer interior illumination.
const finish={blue:material('#102b46',.25,.40),cell:material('#244563',.28,.55),rim:material('#8898a6',.32,.82),
 pale:material('#dbe4e8',.58,.08),rust:material('#785d52',.92,.25),old:material('#87949e',.84,.22),
 red:material('#9f6252',.67,.20),yellow:material('#bc925c',.55,.12),soil:material('#485561',.97,.03),
 iron:material('#8e9aa6',.51,.78),copper:material('#ab7960',.38,.75),crystal:material('#84b1c4',.28,.18),
 cobalt:material('#6488ab',.42,.72),iridium:material('#8e90ab',.26,.86),helium3:material('#9ebecb',.31,.12),ice:material('#b9d1dd',.39,.03),cave:material('#111a25',1),rock:material('#6d7680',.95,.03),relic:material('#798e98',.51,.55)};
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
const power=x=>T.MathUtils.clamp(finite(x),0,1);
function torus(parent,r,t,p,m=mat.metal,arc=Math.PI*2){return mesh(new T.TorusGeometry(r,t,8,40,arc),m,parent,p);}
function horizontalRing(parent,r,t,y,m=mat.metal){const ring=torus(parent,r,t,[0,y,0],m);ring.rotation.x=Math.PI/2;return ring;}
function status(parent,p,color='#b5cdd9'){
 const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.06,roughness:.38,metalness:.05});
 const lamp=box(parent,[.13,.07,.065],p,m);lamp.castShadow=false;return m;
}
function conduit(parent,points,r=.045,m=mat.metal){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(V)),24,r,6,false),m,parent);}
function foot(parent,x,z,size=.65){cyl(parent,size*.52,size*.6,.16,[x,.08,z],mat.dark,16);cyl(parent,.095,.13,.28,[x,.29,z],mat.metal,12);}
function platform(parent,w,d,h=.28){box(parent,[w,h,d],[0,h/2,0],mat.dark);box(parent,[w-.12,.045,d-.12],[0,h+.026,0],finish.rim);}
function vent(parent,p,w=.8,h=.5,rot=0){const g=new T.Group();g.position.set(...p);g.rotation.y=rot;parent.add(g);box(g,[w,h,.07],[0,0,0],mat.dark);for(let i=0;i<6;i++)box(g,[w-.09,.025,.06],[0,-h*.36+i*h*.145,.07],mat.metal);return g;}
function panel(parent,p,w,h,rot=0){const g=new T.Group();g.position.set(...p);g.rotation.y=rot;parent.add(g);box(g,[w,h,.055],[0,0,0],mat.trim);box(g,[w-.055,h-.055,.025],[0,0,.043],finish.pale);return g;}
function bolts(parent,points,r=.035){
 const heads=new T.InstancedMesh(new T.CylinderGeometry(r,r,.022,6),mat.metal,points.length),o=new T.Object3D();o.rotation.x=Math.PI/2;
 points.forEach((p,i)=>{o.position.set(...p);o.updateMatrix();heads.setMatrixAt(i,o.matrix);});heads.castShadow=true;heads.receiveShadow=true;parent.add(heads);return heads;
}
function plaque(parent,text,p,w=2,h=.32){
 const frame=box(parent,[w,h,.055],p,mat.dark);
 if(typeof document==='undefined')return frame;
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=100;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#dbe4e8';ctx.fillRect(0,0,640,100);
 ctx.fillStyle='#263645';ctx.font='bold 44px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,320,52,600);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sign=mesh(new T.PlaneGeometry(w-.06,h-.045),new T.MeshStandardMaterial({map:texture,roughness:.65,metalness:.05}),parent,[p[0],p[1],p[2]+.035]);sign.castShadow=false;return frame;
}
function solarPanel(parent,w,d,p=[0,0,0]){
 const g=new T.Group();g.position.set(...p);parent.add(g);box(g,[w,.12,d],[0,0,0],mat.metal);box(g,[w-.12,.025,d-.12],[0,.078,0],finish.blue);
 const cols=6,rows=4,cw=(w-.25)/cols,cd=(d-.25)/rows;
 const cells=new T.InstancedMesh(new T.BoxGeometry(cw-.025,.013,cd-.025),finish.cell,cols*rows),o=new T.Object3D();
 for(let x=0;x<cols;x++)for(let z=0;z<rows;z++){o.position.set((x-(cols-1)/2)*cw,.103,(z-(rows-1)/2)*cd);o.updateMatrix();cells.setMatrixAt(x*rows+z,o.matrix);}cells.castShadow=false;cells.receiveShadow=true;g.add(cells);
 for(const x of [-w*.28,w*.28])box(g,[.045,.10,d],[x,-.095,0],finish.rim);return g;
}

export function buildingModel(type){
 const root=new T.Group();root.name=`colony-${type}`;root.userData.building=type;
 let animate=()=>{},radius=3,height=3;
 if(type==='solar'){
  for(const x of [-1.3,1.3])for(const z of [-.9,.9]){foot(root,x,z);beam(root,[x,.37,z],[0,1.48,0],.065);}
  cyl(root,.17,.24,1.65,[0,1.1,0],mat.trim);cyl(root,.34,.34,.25,[0,1.98,0],mat.metal);
  const hinge=new T.Group();hinge.position.y=2.12;hinge.rotation.x=-.27;root.add(hinge);
  beam(hinge,[-2.7,-.12,0],[2.7,-.12,0],.08);solarPanel(hinge,2.5,2.55,[-1.4,0,0]);solarPanel(hinge,2.5,2.55,[1.4,0,0]);
  const axle=cyl(root,.18,.18,.9,[0,2.10,0],mat.dark,20);axle.rotation.z=Math.PI/2;for(const x of [-.32,.32])box(root,[.12,.37,.38],[x,1.95,0],mat.trim);
  conduit(hinge,[[-1.7,-.12,.4],[-.7,-.22,.4],[0,-.24,.15],[1.7,-.12,.4]],.025,mat.rubber);
  box(root,[.52,.52,.36],[.45,.72,.2],mat.trim);const light=status(root,[.45,.79,.415]);conduit(root,[[.45,.5,.2],[.48,1.42,.2],[0,1.85,.1]],.032,mat.rubber);
  radius=3;height=2.7;animate=(time,a)=>{hinge.rotation.x=-.27+Math.sin(time*.035)*.065;light.emissiveIntensity=.06+a*.38;};
 }else if(type==='drill'){
  radius=2.8;height=4.95;platform(root,3.6,3.4);
  for(const x of [-1.45,1.45])for(const z of [-1.3,1.3]){foot(root,x,z);beam(root,[x,.4,z],[x*.73,4.35,z*.4],.08);}
  for(const x of [-1.07,1.07]){beam(root,[x,.48,-.52],[x,4.68,-.52],.08);beam(root,[x,.48,.52],[x,4.68,.52],.08);for(let y=.8;y<4.5;y+=.5)beam(root,[x,y,-.52],[x,y+.3,.52],.035,mat.trim);}
  box(root,[2.5,.36,1.35],[0,4.63,0],mat.trim);box(root,[1.2,.75,1.1],[0,3.66,0],mat.suit);cyl(root,.40,.40,.35,[0,3.11,0],mat.metal);
  const spindle=new T.Group();spindle.position.y=.43;root.add(spindle);cyl(spindle,.15,.22,2.9,[0,1.47,0],mat.metal,20);
  const points=[];for(let i=0;i<=132;i++){const t=i/132,angle=t*Math.PI*10;points.push(new T.Vector3(Math.cos(angle)*.34,.10+t*2.60,Math.sin(angle)*.34));}
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),132,.065,6,false),mat.dark,spindle);cyl(spindle,.36,0,.36,[0,.18,0],finish.rim,16);
  box(root,[.64,1.3,1.1],[1.5,1.08,0],mat.trim);vent(root,[1.52,1.15,.59],.49,.65);const light=status(root,[1.52,1.72,.6]);
  bolts(root,[[1.26,.58,.6],[1.75,.58,.6],[1.26,1.59,.6],[1.75,1.59,.6]],.027);
  conduit(root,[[1.55,1.6,-.3],[1.48,3,-.5],[.7,3.68,-.5]],.07,mat.rubber);
  let previous=null;animate=(time,a)=>{const dt=previous===null?0:T.MathUtils.clamp(time-previous,0,.25);previous=time;spindle.rotation.y+=dt*(.12+a*4.5);light.emissiveIntensity=.06+a*.42;};
 }else if(type==='refinery'){
  radius=3.5;height=3.95;platform(root,5.0,3.75);
  for(const x of [-1.28,1.28]){cyl(root,.82,.82,2.20,[x,1.68,-.28],mat.suit,32);cyl(root,.68,.8,.28,[x,2.92,-.28],mat.trim,32);cyl(root,.28,.30,.63,[x,3.36,-.28],mat.metal);cyl(root,.41,.41,.09,[x,3.71,-.28],mat.dark);for(const y of [.7,1.65,2.58]){const ring=horizontalRing(root,.84,.045,y);ring.position.x=x;ring.position.z=-.28;}panel(root,[x,1.65,.565],.73,.63);}
  conduit(root,[[-1.28,2.7,-.3],[-1.28,3.3,-.3],[1.28,3.3,-.3],[1.28,2.7,-.3]],.10);
  box(root,[2.1,1.1,.93],[0,.92,1.12],mat.trim);vent(root,[0,.93,1.62],1.5,.57);for(const x of [-1.52,1.52])conduit(root,[[x,.48,1.05],[x,1.28,1.03],[x*.83,1.55,.42]],.075,mat.dark);
  bolts(root,[[-.94,.49,1.622],[.94,.49,1.622],[-.94,1.35,1.622],[.94,1.35,1.622]]);
  for(const x of [-1.7,1.7]){const valve=torus(root,.14,.025,[x,1.05,1.12],finish.red);beam(root,[x-.13,1.05,1.12],[x+.13,1.05,1.12],.014,finish.red);beam(root,[x,.92,1.12],[x,1.18,1.12],.014,finish.red);}
  const lights=[status(root,[-.64,1.63,1.61]),status(root,[0,1.63,1.61]),status(root,[.64,1.63,1.61])];
  animate=(time,a)=>lights.forEach((m,i)=>{m.emissiveIntensity=.06+a*(.32+.045*Math.sin(time*2.4-i*.9));});
 }else if(type==='warehouse'){
  radius=3;height=2.96;platform(root,4.4,3.7);
  box(root,[4.1,2.4,3.35],[0,1.53,0],mat.trim);box(root,[4.22,.19,3.45],[0,2.82,0],finish.pale);
  for(const x of [-1.93,-1.3,-.65,0,.65,1.3,1.93])for(const z of [-1.70,1.70])box(root,[.065,2.27,.08],[x,1.51,z],mat.metal);
  box(root,[2.56,1.9,.10],[0,1.32,1.744],mat.dark);for(let i=0;i<9;i++)box(root,[2.35,.16,.08],[0,.52+i*.2,1.84],finish.rim);
  for(const x of [-2.08,2.08])for(const z of [-1.73,1.73])box(root,[.22,2.5,.22],[x,1.56,z],mat.metal);
  box(root,[1.02,.32,.05],[0,2.54,1.73],finish.blue);for(const x of [-1.64,1.64])box(root,[.15,.12,.04],[x,2.55,1.76],mat.light);
  for(const x of [-1.48,1.48]){beam(root,[x,.45,1.92],[x,1.91,1.92],.035,mat.dark);box(root,[.25,.11,.10],[x,1.2,1.94],finish.yellow);}
  bolts(root,[[-2.08,.5,1.86],[2.08,.5,1.86],[-2.08,2.65,1.86],[2.08,2.65,1.86]]);
 }else if(type==='science'){
  radius=3.5;height=3.98;platform(root,4.7,4.25);
  box(root,[3.9,2.3,3.6],[0,1.50,-.13],mat.suit);box(root,[4.05,.17,3.73],[0,2.73,-.13],mat.trim);
  for(const x of [-1.91,1.91])for(const z of [-1.88,1.62])box(root,[.12,2.35,.12],[x,1.51,z],mat.metal);
  box(root,[1.2,1.35,.13],[-.80,1.19,1.75],mat.dark);box(root,[1.07,.94,.09],[-.80,1.35,1.85],finish.blue);box(root,[.94,.27,.20],[-.8,.72,1.91],mat.trim);
  box(root,[1.33,.72,.15],[.83,1.34,1.77],mat.trim);box(root,[1.15,.51,.07],[.83,1.36,1.89],mat.dark);
  for(let i=0;i<3;i++){const tube=cyl(root,.10,.10,.32,[.44+i*.38,1.1,1.99],finish.crystal,12);tube.rotation.x=Math.PI/2;}
  plaque(root,'Science Processer',[0,2.31,1.72],3.25,.30);
  bolts(root,[[-1.36,.60,1.826],[-.24,.60,1.826],[-1.36,1.80,1.826],[-.24,1.80,1.826],[.26,1.67,1.86],[1.40,1.67,1.86]],.025);
  conduit(root,[[1.65,.6,1.79],[1.65,1.88,1.79],[1.75,2.40,1.65],[1.76,2.83,.4],[.48,2.84,-.45]],.035,mat.rubber);
  vent(root,[-2.01,1.5,0],1.1,.75,-Math.PI/2);cyl(root,.12,.18,.6,[.48,3.06,-.45],mat.metal,16);
  const scanner=new T.Group();scanner.position.set(.48,3.28,-.45);root.add(scanner);const tilt=new T.Group();tilt.rotation.x=.60;scanner.add(tilt);
  const dishPoints=[[0,0],[.2,.015],[.42,.07],[.64,.18],[.72,.28]].map(a=>new T.Vector2(...a));mesh(new T.LatheGeometry(dishPoints,32),new T.MeshStandardMaterial({color:'#dbe4e8',metalness:.28,roughness:.46,side:T.DoubleSide}),tilt);horizontalRing(tilt,.72,.025,.28);beam(tilt,[0,0,0],[0,.62,0],.025);cyl(tilt,.07,.07,.14,[0,.63,0],mat.dark,12);
  const light=status(root,[1.45,1.84,1.91]);animate=(time,a)=>{scanner.rotation.y=Math.sin(time*.14)*.9;tilt.rotation.x=.6+Math.sin(time*.11)*.10;light.emissiveIntensity=.06+a*(.34+.03*Math.sin(time*3));};
 }else if(type==='hangar'){
  radius=7;height=7.98;cyl(root,6.8,6.8,.16,[0,.08,0],mat.dark,64);cyl(root,6.66,6.66,.055,[0,.195,0],finish.rim,64);
  // An open assembly bay leaves the player's rocket visible from every side.
  for(const x of [-4.1,4.1])for(const z of [-4.1,4.1]){box(root,[1.0,.4,1.0],[x,.4,z],mat.dark);beam(root,[x,.5,z],[x,7.6,z],.16,mat.trim);for(const y of [1.5,3.5,5.5]){box(root,[.42,.18,.42],[x,y,z],mat.metal);}}
  for(const x of [-4.1,4.1]){beam(root,[x,7.52,-4.3],[x,7.52,4.3],.22);beam(root,[x,6.92,-4.3],[x,6.92,4.3],.10);for(let z=-4.1;z<4;z+=1.05)beam(root,[x,6.92,z],[x,7.52,z+1],.035,mat.trim);beam(root,[x,.6,-4.1],[x,3.0,-1.7],.075,mat.metal);beam(root,[x,.6,4.1],[x,3,1.7],.075,mat.metal);}
  for(const z of [-4.1,4.1]){beam(root,[-4.1,7.6,z],[4.1,7.6,z],.17,mat.trim);box(root,[5.9,.06,.15],[0,7.35,z],mat.light);}
  const crane=new T.Group();crane.position.y=7.14;root.add(crane);box(crane,[8.5,.25,.4],[0,0,0],mat.metal);box(crane,[.7,.5,.8],[0,-.1,0],finish.yellow);beam(crane,[0,-.4,0],[0,-1.52,0],.025,mat.dark);const hook=torus(crane,.17,.035,[0,-1.68,0],mat.metal,Math.PI*1.65);hook.rotation.z=.5;
  for(const x of [-5,5]){box(root,[.75,.8,2.7],[x,.63,0],mat.trim);for(let i=0;i<5;i++)box(root,[.78,.035,2.4],[x,.37+i*.145,0],mat.metal);}
  for(const x of [-4.1,4.1]){conduit(root,[[x,.6,-3.8],[x+.16,2,-3.8],[x+.16,5.6,-3.8],[x,7.4,-3.8]],.045,mat.rubber);box(root,[.6,1.05,.4],[x,1.3,3.77],mat.trim);vent(root,[x,1.3,4.01],.4,.65);bolts(root,[[x-.23,.84,4.01],[x+.23,.84,4.01],[x-.23,1.75,4.01],[x+.23,1.75,4.01]],.027);}
  for(const z of [-3.2,3.2])for(let i=0;i<7;i++)box(root,[.34,.018,.10],[-1.8+i*.6,.234,z],finish.yellow);
  animate=(time,a)=>{crane.position.z=Math.sin(time*.12)*(.3+a*1.1);};
 }else throw new RangeError(`Unknown colony building: ${type}`);
 root.userData.footprintRadius=radius;root.userData.height=height;
 return {root,update(time,activity=0){animate(finite(time),power(activity));}};
}

function ruggedRock(parent,p,size,m=finish.rock,seed=0){
 const geometry=new T.IcosahedronGeometry(1,1),attribute=geometry.attributes.position;
 for(let i=0;i<attribute.count;i++){const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i);const s=1+.1*Math.sin(x*7+y*13+z*5+seed);attribute.setXYZ(i,x*s,y*s,z*s);}geometry.computeVertexNormals();
 const rock=mesh(geometry,m,parent,p);rock.scale.set(...size);rock.rotation.y=seed;return rock;
}
export function depositModel(mineral){
 if(!['iron','copper','crystal','ice','cobalt','iridium','helium3'].includes(mineral))throw new RangeError(`Unknown mineral: ${mineral}`);
 const root=new T.Group();root.name=`deposit-${mineral}`;root.userData.mineral=mineral;
 ruggedRock(root,[0,.46,0],[1.33,.62,1.07],finish.soil,2.7);
 for(let i=0;i<7;i++){const angle=i*2.4,r=.42+(i%3)*.34,x=Math.cos(angle)*r,z=Math.sin(angle)*r,size=.28+(i%3)*.08;
  if(mineral==='crystal'){
   const crystal=cyl(root,0,size,.65+(i%3)*.28,[x,.67+(i%3)*.12,z],finish.crystal,6);crystal.rotation.z=Math.cos(angle)*.20;crystal.rotation.x=Math.sin(angle)*.18;
  }else ruggedRock(root,[x,.55+(i%2)*.15,z],[size*1.6,size*.8,size],(finish[mineral]||finish.crystal),angle);
 }
 if(mineral==='iron'||mineral==='copper')for(let i=0;i<3;i++)conduit(root,[[-.97,.62,-.55+i*.45],[-.4,.98,-.25+i*.3],[.3,.96,-.37+i*.3],[1.08,.59,-.36+i*.41]],.035,(finish[mineral]||finish.crystal));
 root.userData.footprintRadius=1.8;return {root};
}

export function discoveryModel(type){
 const root=new T.Group();root.name=`discovery-${type}`;root.userData.discovery=type;
 if(type==='probe'){
  const hull=new T.Group();hull.position.set(0,.95,0);hull.rotation.set(.13,.4,-.27);root.add(hull);cyl(hull,.73,.9,1.28,[0,.5,0],mat.gold,12);cyl(hull,.83,.83,.17,[0,1.2,0],mat.trim,12);
  for(const x of [-1,1]){beam(hull,[x*.7,.8,0],[x*1.6,.8,0],.05);const panel=solarPanel(hull,1.85,1.25,[x*2.3,.72,0]);panel.rotation.z=x*.18;}
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam(root,[Math.cos(a)*.6,1.1,Math.sin(a)*.6],[Math.cos(a)*1.4,.08,Math.sin(a)*1.4],.055,finish.old);}
  const dish=new T.Group();dish.position.set(0,2.4,0);dish.rotation.z=-.4;root.add(dish);cyl(dish,.15,.3,.7,[0,0,0],mat.metal);const bowl=mesh(new T.SphereGeometry(.63,24,12,0,Math.PI*2,0,.9),finish.old,dish,[0,.22,0]);bowl.rotation.x=Math.PI;beam(dish,[0,.2,0],[.45,.75,0],.022,mat.dark);
  box(root,[.4,.17,.6],[2.6,.11,1.4],finish.rust);beam(root,[-1,.1,1.2],[-2.6,.13,2],.018,mat.dark);
 }else if(type==='outpost'){
  platform(root,6.0,5.1,.18);box(root,[5.5,2.7,4.5],[0,1.61,-.1],finish.old);box(root,[5.7,.18,4.7],[0,3.05,-.1],finish.rust);
  for(const x of [-2.68,2.68])for(const z of [-2.3,2.1])box(root,[.13,2.78,.13],[x,1.61,z],mat.metal);
  box(root,[1.25,2.18,.10],[0,1.34,2.205],mat.dark);const door=box(root,[1.02,2.1,.09],[1.05,1.33,2.6],finish.old);door.rotation.y=-.45;
  for(const x of [-1.72,1.72]){box(root,[1.05,.74,.1],[x,1.96,2.2],mat.dark);box(root,[.98,.045,.14],[x,1.94,2.28],finish.rust);}
  for(let i=0;i<5;i++)box(root,[1.6,.035,.075],[-1.4+i*.73,2.45-(i%2)*.13,2.27],finish.rust).rotation.z=-.15+i*.08;
  const wing=solarPanel(root,2.3,2,[3.9,.70,-.9]);wing.rotation.z=-.42;beam(root,[2.3,.3,-.8],[3.8,.4,-1.4],.05,finish.rust);
  for(let i=0;i<5;i++)ruggedRock(root,[-2.7+i*1.3,.15,3.2],[.3,.19,.25],finish.rust,i);
  beam(root,[-2.1,3.2,-1.4],[-2.1,4.35,-1.4],.025,mat.metal);beam(root,[-2.1,4.2,-1.4],[-1.4,4.25,-1.4],.022,mat.metal);
 }else if(type==='cave'){
  // Arched tunnel shell, open at the front; a recessed end stays well behind it.
  const path=[];for(let i=0;i<=16;i++){const a=i/16*Math.PI;path.push(new T.Vector3(Math.cos(a)*2.25,.65+Math.sin(a)*2.25,0));}
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(path),32,.62,8,false),finish.rock,root);
  const positions=[],indices=[],sections=24;
  for(let end=0;end<2;end++)for(let i=0;i<=sections;i++){const a=i/sections*Math.PI;positions.push(Math.cos(a)*2.0,.61+Math.sin(a)*2.0,end?-3.15:-.3);}
  for(let i=0;i<sections;i++){const a=i,b=i+1,c=i+sections+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(positions,3));geom.setIndex(indices);geom.computeVertexNormals();mesh(geom,new T.MeshStandardMaterial({color:'#252e2e',roughness:1,side:T.DoubleSide}),root);
  const end=mesh(new T.CircleGeometry(1.99,32,0,Math.PI),finish.cave,root,[0,.61,-3.20]);end.rotation.y=0;box(root,[3.8,.14,3.5],[0,.12,-1.3],finish.cave);
  for(const x of [-2.65,2.65])ruggedRock(root,[x,.66,-.7],[.95,.75,1.6],finish.rock,x);
  for(let i=0;i<5;i++)ruggedRock(root,[-1.5+i*.75,2.45+Math.sin(i*.8)*.25,-1.65],[.72,.60,1.7],finish.rock,i);
 }else if(type==='anomaly'){
  cyl(root,2.1,2.65,.28,[0,.14,0],finish.rock,9);const relic=new T.Group();relic.position.y=.28;root.add(relic);
  const ring=torus(relic,1.8,.19,[0,2.0,0],finish.relic,Math.PI*1.73);ring.rotation.z=-.28;
  for(const x of [-1.44,1.44]){const column=box(relic,[.43,2.5,.67],[x,1.25,0],finish.relic);column.rotation.z=-x*.08;for(let i=0;i<5;i++)box(relic,[.48,.045,.12],[x,.55+i*.35,.38],finish.rim);}
  const core=mesh(new T.OctahedronGeometry(.50),finish.crystal,relic,[0,1.9,0]);core.rotation.set(.4,.2,.1);horizontalRing(relic,1.0,.035,.19,mat.metal);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.3;ruggedRock(root,[Math.cos(a)*2.4,.24,Math.sin(a)*2.4],[.6,.3,.45],finish.relic,a);}
 }else throw new RangeError(`Unknown discovery: ${type}`);
 root.userData.footprintRadius=type==='outpost'?6:4;return {root};
}
