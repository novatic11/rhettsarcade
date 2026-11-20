import * as T from './vendor/three.module.js';
import {box,beam,cyl,sphere,mesh,mat} from './models.js';

const makeMaterial=(color,roughness=.72,metalness=.25)=>new T.MeshStandardMaterial({color,roughness,metalness});
const finish={white:makeMaterial('#dbe4e8',.58,.08),steel:makeMaterial('#8898a6',.32,.82),blue:makeMaterial('#49667d',.54,.22),
 copper:makeMaterial('#ab7960',.38,.75),cold:makeMaterial('#cbdce5',.86,.04),green:makeMaterial('#688878',.89,.01),
 amber:makeMaterial('#bc925c',.55,.12),screen:makeMaterial('#102b46',.20,.42)};
const RADII={wind:4,geothermal:3.5,solarfarm:6,megabattery:4,smelter:4,electronicsfab:3.5,chemicalplant:4,waterextractor:3,oreseparator:3.5,machineworks:4,greenhouse:4,observatory:4,antimatterlab:4,tradehub:4};
const finite=x=>Number.isFinite(x)?x:0;
let mistTexture;
function torus(parent,r,t,p,m=mat.metal,arc=Math.PI*2){return mesh(new T.TorusGeometry(r,t,6,32,arc),m,parent,p);}
function ringY(parent,r,t,p,m=mat.metal){const o=torus(parent,r,t,p,m);o.rotation.x=Math.PI/2;return o;}
function pipe(parent,points,r=.045,m=mat.metal){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,r,6,false),m,parent);}
function bolts(parent,points,r=.026){const heads=new T.InstancedMesh(new T.CylinderGeometry(r,r,.024,6),mat.metal,points.length),o=new T.Object3D();o.rotation.x=Math.PI/2;points.forEach((p,i)=>{o.position.set(...p);o.updateMatrix();heads.setMatrixAt(i,o.matrix);});heads.castShadow=false;heads.receiveShadow=true;parent.add(heads);}
function vent(parent,p,w=.7,h=.5,rotation=0){const g=new T.Group();g.position.set(...p);g.rotation.y=rotation;parent.add(g);box(g,[w,h,.06],[0,0,0],mat.dark);for(let i=0;i<6;i++)box(g,[w-.10,.025,.05],[0,-h*.35+i*h*.14,.066],mat.metal);return g;}
function panel(parent,p,w,h){box(parent,[w,h,.05],p,mat.trim);box(parent,[w-.09,h-.09,.025],[p[0],p[1],p[2]+.047],finish.white);}
function valve(parent,p,r=.13){const g=new T.Group();g.position.set(...p);parent.add(g);torus(g,r,.022,[0,0,0],finish.blue);beam(g,[-r,0,0],[r,0,0],.014,finish.blue);beam(g,[0,-r,0],[0,r,0],.014,finish.blue);return g;}
function serviceBase(root,r){
 box(root,[r*1.30,.18,r*1.15],[0,.09,0],mat.dark);box(root,[r*1.30-.12,.04,r*1.15-.12],[0,.205,0],finish.steel);
 const width=r*1.16,z=r*.6;box(root,[width,1.00,.30],[0,.735,z-.15],mat.trim);box(root,[width,.055,.34],[0,1.265,z-.15],finish.blue);
 for(const x of [-width*.46,width*.46])box(root,[.08,.76,.035],[x,.72,z+.022],mat.metal);
}
function tank(parent,p,r,h,m=finish.white){
 const g=new T.Group();g.position.set(...p);parent.add(g);cyl(g,r,r,h,[0,h/2+.25,0],m,24);
 cyl(g,r*.74,r,.28,[0,h+.39,0],m,24);cyl(g,r,r*.74,.22,[0,.14,0],mat.trim,24);
 for(const y of [.42,h+.06])ringY(g,r+.018,.034,[0,y,0],mat.metal);cyl(g,r*.22,r*.26,.18,[0,h+.62,0],mat.metal,16);return g;
}
function ladder(parent,p,height,width=.48){const g=new T.Group();g.position.set(...p);parent.add(g);for(const x of [-width/2,width/2])beam(g,[x,0,0],[x,height,0],.025,mat.metal);for(let y=.15;y<height;y+=.28)beam(g,[-width/2,y,.015],[width/2,y,.015],.025,mat.trim);return g;}
function light(root,p,list,color='#b5cdd9'){
 const material=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.035,roughness:.38,metalness:.05});box(root,[.13,.075,.055],p,material);list.push(material);return material;
}
function fan(parent,p,r=.30){
 const group=new T.Group();group.position.set(...p);parent.add(group);cyl(group,r+.055,r+.055,.16,[0,0,0],mat.dark,20).rotation.x=Math.PI/2;torus(group,r+.035,.025,[0,0,.105],mat.metal);
 const rotor=new T.Group();rotor.position.z=.12;group.add(rotor);cyl(rotor,.075,.075,.045,[0,0,0],mat.metal,10).rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,o=box(rotor,[r*.67,.12,.035],[Math.cos(a)*r*.49,Math.sin(a)*r*.49,0],finish.steel);o.rotation.z=a+.35;}return rotor;
}
function frostedMist(parent,count=3){
 if(!mistTexture){const n=32,data=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const r=Math.hypot((x+.5-n/2)/(n/2),(y+.5-n/2)/(n/2)),i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=r<1?Math.round(Math.pow(1-r*r,2.5)*255):0;}mistTexture=new T.DataTexture(data,n,n,T.RGBAFormat);mistTexture.minFilter=mistTexture.magFilter=T.LinearFilter;mistTexture.needsUpdate=true;}
 return Array.from({length:count},()=>{const puff=new T.Sprite(new T.SpriteMaterial({map:mistTexture,color:'#dce7ef',transparent:true,opacity:0,depthWrite:false,depthTest:true}));puff.name='working-process-vapor';parent.add(puff);return puff;});
}
function glassMaterial(){const m=new T.MeshStandardMaterial({color:'#779db9',roughness:.22,metalness:.12,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false});m.forceSinglePass=true;return m;}
function stationaryBatches(root,moving){
 for(const scope of [root,...moving]){
  if(scope.isMesh||scope.isSprite)continue;root.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(scope.matrixWorld).invert(),buckets=new Map();
  scope.traverse(object=>{if(!object.isMesh||object.isInstancedMesh)return;for(let a=object;a&&a!==scope;a=a.parent)if(moving.has(a))return;const key=object.material.uuid+':'+object.renderOrder,bucket=buckets.get(key)||[];bucket.push(object);buckets.set(key,bucket);});
  for(const objects of buckets.values()){
   if(objects.length<2)continue;let count=0;const sources=objects.map(object=>{const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,object.matrixWorld));count+=g.attributes.position.count;return g;});
   const g=new T.BufferGeometry();for(const [name,size] of [['position',3],['normal',3],['uv',2]]){const array=new Float32Array(count*size);let at=0;for(const source of sources){array.set(source.attributes[name].array,at);at+=source.attributes[name].array.length;}g.setAttribute(name,new T.BufferAttribute(array,size));}
   const batch=new T.Mesh(g,objects[0].material);batch.name='batched-colony-hardware';batch.castShadow=false;batch.receiveShadow=!objects[0].material.transparent;batch.renderOrder=objects[0].renderOrder;objects.forEach(o=>o.removeFromParent());sources.forEach(o=>o.dispose());scope.add(batch);
  }
 }
}

export function contentBuildingModel(type){
 if(!Object.hasOwn(RADII,type))throw new RangeError(`Unknown content building: ${type}`);
 const root=new T.Group(),radius=RADII[type],moving=new Set(),lights=[];root.name=`content-${type}`;root.userData.building=type;root.userData.footprintRadius=radius;serviceBase(root,radius);
 let animate=()=>{},phase=0,blend=0,previous=null,height=4;
 if(type==='wind'){
  height=11.0;const pole=cyl(root,.18,.42,6.8,[0,3.62,-.8],finish.white,24);ringY(root,.44,.04,[0,.42,-.8]);
  for(const x of [-1.5,1.5])beam(root,[x,.24,-.8],[0,2.05,-.8],.055,mat.metal);
  box(root,[.66,.62,1.3],[0,7.1,-.8],finish.white);vent(root,[.36,7.08,-.85],.62,.33,Math.PI/2);
  const rotor=new T.Group();rotor.position.set(0,7.1,-.08);root.add(rotor);moving.add(rotor);sphere(rotor,.25,[0,0,.08],mat.trim,18);
  for(let i=0;i<3;i++){const blade=new T.Group();blade.rotation.z=i*Math.PI*2/3;rotor.add(blade);const shape=new T.Shape();shape.moveTo(-.11,.15);shape.lineTo(.08,.20);shape.bezierCurveTo(.35,.85,.23,2.20,.11,2.80);shape.lineTo(-.08,2.80);shape.bezierCurveTo(-.10,2.06,-.35,.80,-.11,.15);mesh(new T.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:false,curveSegments:8}),finish.white,blade);box(blade,[.15,.16,.025],[.04,2.56,.092],finish.blue);}
  box(root,[.72,1.0,.58],[.74,.74,-.64],mat.trim);pipe(root,[[.74,.6,-.65],[.74,.35,.6],[0,.35,1.93]],.04,mat.rubber);light(root,[0,1.39,2.43],lights);
  animate=()=>{rotor.rotation.z=-phase*.28;};
 }else if(type==='geothermal'){
  height=3.55;
  for(const x of [-.92,.92]){tank(root,[x,.23,-.45],.55,1.95,finish.white);cyl(root,.17,.22,.60,[x,.45,-.45],finish.copper,16);ringY(root,.65,.07,[x,.38,-.45]);}
  pipe(root,[[-.92,2.48,-.45],[-.92,2.92,-.45],[.92,2.92,-.45],[.92,2.48,-.45]],.11,finish.copper);
  pipe(root,[[-.92,1.12,-.02],[-.92,1.12,.64],[.92,1.12,.64],[.92,.62,1.65]],.10,finish.copper);valve(root,[-.65,1.17,.85]);valve(root,[.71,1.17,.85]);
  box(root,[.66,.96,.68],[-1.59,.76,-.52],mat.trim);const rotor=fan(root,[-1.59,.85,-.14],.24);moving.add(rotor);
  ladder(root,[1.56,.35,-.15],2.0,.36);light(root,[0,1.39,2.13],lights);
  const mist=frostedMist(root,2);animate=a=>{rotor.rotation.z=-phase*2.5;mist.forEach((p,i)=>{const f=(phase/(Math.PI*2)*1.5+i*.5)%1;p.position.set((i?1:-1)*.92,2.82+f*.38,-.45);p.scale.setScalar(.22+f*.36);p.material.opacity=Math.sin(f*Math.PI)*a*.08;});};
 }else if(type==='solarfarm'){
  height=3.50;
  for(const x of [-3.4,-1.14,1.14,3.4])for(const z of [-1.23,1.23]){cyl(root,.22,.33,.15,[x,.30,z],mat.dark,14);beam(root,[x,.34,z],[x,2.24,z],.085,mat.trim);beam(root,[x,.35,z],[x,1.54,0],.045,mat.metal);}
  const bank=new T.Group();bank.position.y=2.48;root.add(bank);moving.add(bank);beam(bank,[-4.48,-.17,0],[4.48,-.17,0],.11,mat.metal);
  const cells=new T.InstancedMesh(new T.BoxGeometry(.31,.014,.40),finish.blue,192),o=new T.Object3D();let index=0;
  for(const x of [-3.4,-1.14,1.14,3.4])for(const z of [-1.23,1.23]){
   box(bank,[2.16,.12,2.04],[x,0,z],mat.metal);box(bank,[2.03,.028,1.91],[x,.088,z],mat.dark);
   for(let a=0;a<6;a++)for(let b=0;b<4;b++){o.position.set(x+(a-2.5)*.325,.118,z+(b-1.5)*.44);o.updateMatrix();cells.setMatrixAt(index++,o.matrix);}
  }bank.add(cells);cells.castShadow=false;cells.receiveShadow=true;
  box(root,[.92,1.0,.65],[0,.74,2.1],mat.trim);vent(root,[0,.78,2.47],.72,.56);light(root,[0,1.40,3.63],lights);
  animate=()=>{bank.rotation.x=-.18+Math.sin(phase*.025)*.05;bank.rotation.y=Math.sin(phase*.012)*.025;};
 }else if(type==='megabattery'){
  height=3.56;
  for(const x of [-1.48,0,1.48])for(const z of [-.76,.76]){box(root,[1.23,2.4,1.24],[x,1.52,z],finish.white);for(const y of [.65,1.55,2.48])box(root,[1.27,.055,1.28],[x,y,z],mat.metal);box(root,[1.12,.17,1.12],[x,2.88,z],mat.trim);for(const xx of [-.24,.24])cyl(root,.075,.075,.19,[x+xx,3.07,z],finish.copper,12);}
  for(const x of [-1.72,-1.24,-.24,.24,1.24,1.72])box(root,[.075,.07,1.62],[x,3.23,0],finish.copper);
  for(const x of [-2.12,2.12]){beam(root,[x,.24,-1.52],[x,3.17,-1.52],.07);beam(root,[x,.24,1.52],[x,3.17,1.52],.07);beam(root,[x,3.17,-1.52],[x,3.17,1.52],.07);}
  for(const x of [-1.48,0,1.48]){vent(root,[x,1.98,1.42],.83,.6);panel(root,[x,.85,1.42],.83,.6);light(root,[x,1.38,1.51],lights);}
  box(root,[.73,.80,.62],[0,.74,-1.7],mat.trim);const rotor=fan(root,[0,.84,-2.06],.25);rotor.parent.rotation.y=Math.PI;moving.add(rotor);animate=()=>{rotor.rotation.z=-phase*2.3;};
 }else if(type==='smelter'){
  height=4.42;
  box(root,[2.02,2.26,1.82],[-.45,1.47,-.6],mat.dark);box(root,[2.12,.23,1.92],[-.45,2.72,-.6],finish.white);
  for(const x of [-1.48,.58]){box(root,[.18,2.1,1.90],[x,1.55,-.6],finish.white);pipe(root,[[x,1.04,.34],[x,2.92,.34],[x*.6,3.18,-.1]],.065,finish.copper);}
  box(root,[1.45,.73,.08],[-.45,1.91,.345],mat.metal);const heat=new T.MeshStandardMaterial({color:'#76452e',emissive:'#c27742',emissiveIntensity:0,roughness:.72});box(root,[1.17,.47,.04],[-.45,1.91,.415],heat);
  box(root,[.64,.15,1.75],[-.45,1.46,1.11],mat.metal);for(const x of [-.79,-.11])box(root,[.07,.17,1.75],[x,1.55,1.11],mat.trim);box(root,[.49,.028,1.63],[-.45,1.553,1.11],heat);
  cyl(root,.37,.48,1.25,[-.45,3.50,-.6],mat.trim,20);cyl(root,.49,.49,.09,[-.45,4.18,-.6],mat.dark,20);
  box(root,[.82,1.32,1.18],[1.49,1.02,-.45],mat.trim);vent(root,[1.49,1.15,.19],.63,.73);const rotor=fan(root,[1.49,1.92,-.4],.27);moving.add(rotor);
  for(const x of [1.14,1.84])beam(root,[x,.24,1.62],[x,1.33,1.62],.055);box(root,[.88,.12,1.41],[1.49,1.37,1.18],mat.metal);for(const z of [.67,1.13,1.6])box(root,[.65,.20,.31],[1.49,1.53,z],finish.steel);
  light(root,[1.50,1.39,2.43],lights);animate=a=>{rotor.rotation.z=-phase*2.4;heat.emissiveIntensity=a*1.35;};
 }else if(type==='electronicsfab'){
  height=3.62;
  box(root,[3.73,.38,2.53],[0,1.42,-.30],finish.white);box(root,[3.8,.22,2.60],[0,3.34,-.3],finish.white);box(root,[3.72,1.70,.17],[0,2.38,-1.52],mat.trim);
  for(const x of [-1.78,1.78])box(root,[.18,1.65,2.53],[x,2.40,-.3],finish.white);
  const glass=glassMaterial();mesh(new T.PlaneGeometry(3.35,1.45),glass,root,[0,2.41,1.0]);for(const y of [1.65,3.17])box(root,[3.55,.075,.13],[0,y,1.01],mat.metal);
  for(const x of [-1.7,1.7])box(root,[.075,1.54,.13],[x,2.41,1.01],mat.metal);
  for(let i=0;i<6;i++)cyl(root,.43,.43,.028,[-.82,1.78+i*.055,-.26],mat.metal,24);
  const robot=new T.Group();robot.position.set(.60,1.83,-.29);root.add(robot);moving.add(robot);cyl(robot,.19,.23,.20,[0,0,0],mat.trim,16);beam(robot,[0,.10,0],[.08,.65,.1],.08,finish.white);beam(robot,[.08,.65,.1],[-.64,.66,.1],.065,mat.metal);box(robot,[.28,.055,.36],[-.68,.66,.12],mat.trim);
  vent(root,[-1.18,3.54,-.42],.92,.15);vent(root,[1.18,3.54,-.42],.92,.15);pipe(root,[[-1.55,1.74,-1.4],[-1.55,3.02,-1.4],[1.4,3.02,-1.4]],.04,finish.blue);
  light(root,[1.35,3.05,1.12],lights);animate=()=>{robot.rotation.y=Math.sin(phase*.3)*.27;};
 }else if(type==='chemicalplant'){
  height=4.86;
  tank(root,[-.87,.23,-.52],.66,3.61);tank(root,[.96,.23,-.52],.79,2.85);
  pipe(root,[[-.87,3.58,-.52],[-.87,4.24,-.52],[.96,4.24,-.52],[.96,3.42,-.52]],.12,finish.copper);
  pipe(root,[[-.87,1.23,.03],[-.87,1.23,1.17],[.96,1.23,1.17],[.96,.55,1.97]],.10,mat.metal);for(const x of [-.53,.63])valve(root,[x,1.27,1.36],.14);
  ladder(root,[-1.56,.36,-.06],3.45,.41);for(const y of [1.3,2.3,3.3])beam(root,[-1.56,y,-.06],[-1.02,y,-.12],.025);
  box(root,[.65,.88,.73],[1.91,.77,-.58],mat.trim);const rotor=fan(root,[1.91,.82,-.18],.23);moving.add(rotor);vent(root,[0,.78,-1.72],.72,.5,Math.PI);
  light(root,[0,1.39,2.43],lights);animate=()=>{rotor.rotation.z=-phase*2.7;};
 }else if(type==='waterextractor'){
  height=3.85;tank(root,[-.55,.23,-.35],.65,1.88,finish.cold);
  for(let i=0;i<8;i++)box(root,[1.06,.045,.92],[-.55,2.40+i*.055,-.35],mat.metal);
  for(const x of [.61,1.28])beam(root,[x,.24,-.40],[x,2.51,-.40],.055,mat.trim);box(root,[.94,.22,.63],[.95,2.54,-.40],finish.white);
  const drill=new T.Group();drill.position.set(.95,.23,-.4);root.add(drill);moving.add(drill);cyl(drill,.095,.14,1.85,[0,1.0,0],mat.metal,16);
  const helix=[];for(let i=0;i<=90;i++){const f=i/90,a=f*Math.PI*10;helix.push(new T.Vector3(Math.cos(a)*.20,.11+f*1.65,Math.sin(a)*.20));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(helix),90,.026,5,false),finish.blue,drill);
  pipe(root,[[-.55,1.22,.20],[-.55,1.22,.89],[.95,1.22,.89],[.95,.52,1.45]],.09,finish.cold);for(const x of [-.3,.7])valve(root,[x,1.27,1.05],.11);
  box(root,[.55,.82,.65],[-1.26,.73,-.45],mat.trim);const rotor=fan(root,[-1.26,.83,-.09],.20);moving.add(rotor);
  for(let i=0;i<6;i++){const a=i*2.4,ice=cyl(root,0,.045,.15,[.95+Math.cos(a)*.22,.28,Math.sin(a)*.22-.4],finish.cold,5);ice.rotation.z=Math.cos(a)*.3;}
  const mist=frostedMist(root,2);light(root,[0,1.39,1.83],lights);animate=a=>{drill.rotation.y=phase*.8;rotor.rotation.z=-phase*2.7;mist.forEach((p,i)=>{const f=(phase/(Math.PI*2)*1.5+i*.5)%1;p.position.set(-.55+f*.08,2.86+f*.46,-.35);p.scale.setScalar(.19+f*.32);p.material.opacity=Math.sin(f*Math.PI)*a*.08;});};
 }else if(type==='oreseparator'){
  height=3.88;
  for(const x of [-1.19,1.19])for(const z of [-1.16,.44])beam(root,[x,.24,z],[x,2.92,z],.07,mat.trim);
  const hopperMaterial=finish.white.clone();hopperMaterial.side=T.DoubleSide;const hopper=mesh(new T.CylinderGeometry(1.28,.59,.88,4,1,true),hopperMaterial,root,[0,3.05,-.4]);hopper.rotation.y=Math.PI/4;
  for(const x of [-.94,.94])box(root,[.08,.10,1.96],[x,3.52,-.4],mat.metal);for(const z of [-1.34,.54])box(root,[1.96,.10,.08],[0,3.52,z],mat.metal);
  for(const z of [-.72,-.02]){const roller=new T.Group();roller.position.set(0,2.33,z);root.add(roller);moving.add(roller);cyl(roller,.28,.28,1.98,[0,0,0],mat.metal,16).rotation.z=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4,o=box(roller,[1.91,.045,.07],[0,Math.cos(a)*.28,Math.sin(a)*.28],mat.metal);o.rotation.x=a;}roller.userData.turn=z<-.3?1:-1;}
  const sieve=new T.Group();sieve.position.set(0,1.45,.84);sieve.rotation.x=-.15;root.add(sieve);moving.add(sieve);
  const shape=new T.Shape();shape.moveTo(-.85,-.70);shape.lineTo(.85,-.70);shape.lineTo(.85,.70);shape.lineTo(-.85,.70);shape.closePath();for(let x=0;x<4;x++)for(let y=0;y<4;y++){const hole=new T.Path();hole.absellipse((x-1.5)*.34,(y-1.5)*.28,.065,.065,0,Math.PI*2,true);shape.holes.push(hole);}const sheet=mesh(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false,curveSegments:5}),finish.steel,sieve);sheet.rotation.x=-Math.PI/2;
  for(const x of [-.91,.91])box(sieve,[.08,.18,1.55],[x,.09,0],mat.metal);beam(root,[-.85,.24,1.57],[-.85,1.32,1.57],.06);beam(root,[.85,.24,1.57],[.85,1.32,1.57],.06);
  for(let i=0;i<5;i++){const rock=mesh(new T.IcosahedronGeometry(.16,0),mat.metal,root,[Math.sin(i*2.4)*.44,3.30+(i%2)*.10,Math.cos(i*2.4)*.42-.4]);rock.scale.set(1,.7,1.15);}
  box(root,[.58,.83,.70],[1.49,.76,-.38],mat.trim);light(root,[0,1.39,2.13],lights);
  const rollers=[...moving].filter(o=>o.userData.turn);animate=()=>{for(const r of rollers)r.rotation.x=phase*1.7*r.userData.turn;sieve.rotation.z=Math.sin(phase*7)*.004*blend;};
 }else if(type==='machineworks'){
  height=4.18;
  box(root,[3.0,.35,2.14],[0,1.17,-.18],mat.trim);for(const z of [-.9,-.4,.1,.6])box(root,[2.84,.07,.09],[0,1.39,z],mat.metal);
  for(const x of [-1.55,1.55]){box(root,[.32,2.9,.58],[x,2.28,-.75],finish.white);beam(root,[x,.28,-1.45],[x,2.7,-.75],.06,mat.metal);}box(root,[3.50,.36,.72],[0,3.88,-.75],finish.blue);beam(root,[-1.58,3.61,-.35],[1.58,3.61,-.35],.055,mat.metal);
  const carriage=new T.Group();carriage.position.set(0,3.19,-.35);root.add(carriage);moving.add(carriage);box(carriage,[.62,.83,.68],[0,0,0],finish.white);cyl(carriage,.15,.19,.36,[0,-.57,0],mat.metal,16);
  const spindle=new T.Group();spindle.position.y=-.84;carriage.add(spindle);moving.add(spindle);cyl(spindle,.055,.07,.28,[0,0,0],mat.metal,12);for(const x of [-.045,.045])beam(spindle,[x,-.13,0],[-x,.12,0],.012,mat.metal);
  box(root,[.95,.26,.74],[0,1.56,-.25],mat.metal);for(const x of [-.50,.50])box(root,[.15,.36,.88],[x,1.60,-.25],mat.dark);
  const arm=new T.Group();arm.position.set(1.86,1.41,.7);root.add(arm);moving.add(arm);cyl(root,.24,.30,1.14,[1.86,.84,.7],finish.white,16);box(arm,[.19,.78,.23],[0,.39,0],finish.white);cyl(arm,.15,.15,.28,[0,.07,0],mat.metal,12).rotation.x=Math.PI/2;
  const elbow=new T.Group();elbow.position.y=.78;arm.add(elbow);moving.add(elbow);box(elbow,[.17,.72,.20],[0,.36,0],finish.white);cyl(elbow,.13,.13,.25,[0,0,0],mat.metal,12).rotation.x=Math.PI/2;for(const x of [-.09,.09])box(elbow,[.055,.24,.13],[x,.85,0],mat.metal);
  vent(root,[-1.57,2.49,-.39],.23,.63);light(root,[0,1.39,2.43],lights);animate=()=>{carriage.position.x=Math.sin(phase*.25)*.68;spindle.rotation.y=phase*4;arm.rotation.z=.40+Math.sin(phase*.2)*.06;elbow.rotation.z=1.49+Math.sin(phase*.2+.6)*.08;};
 }else if(type==='greenhouse'){
  height=3.34;
  box(root,[3.95,.70,3.50],[0,.62,0],finish.white);box(root,[3.80,.12,3.36],[0,1.04,0],mat.dark);
  const glass=glassMaterial(),roof=mesh(new T.CylinderGeometry(1.9,1.9,3.3,32,1,true,-Math.PI/2,Math.PI),glass,root,[0,1.2,0]);roof.rotation.x=-Math.PI/2;
  for(const z of [-1.68,1.68])mesh(new T.CircleGeometry(1.9,32,0,Math.PI),glass,root,[0,1.2,z]);
  for(const z of [-1.7,-.85,0,.85,1.7])torus(root,1.93,.035,[0,1.2,z],mat.metal,Math.PI);for(const x of [-1.93,1.93])beam(root,[x,1.2,-1.7],[x,1.2,1.7],.035);
  for(const x of [-.65,.65]){box(root,[.98,.20,2.85],[x,1.06,0],mat.trim);box(root,[.86,.025,2.74],[x,1.18,0],mat.dark);}
  const crops=new T.Group();root.add(crops);moving.add(crops);const leaves=new T.InstancedMesh(new T.ConeGeometry(.13,.28,5),finish.green,48),stems=new T.InstancedMesh(new T.CylinderGeometry(.014,.018,.29,6),finish.green,12),o=new T.Object3D();let l=0,s=0;
  for(const x of [-.65,.65])for(let i=0;i<6;i++){const z=-1.15+i*.44;o.position.set(x,1.32,z);o.rotation.set(0,0,0);o.updateMatrix();stems.setMatrixAt(s++,o.matrix);for(let j=0;j<4;j++){const a=j*Math.PI/2;o.position.set(x+Math.cos(a)*.12,1.42+(j%2)*.08,z+Math.sin(a)*.12);o.rotation.set(Math.sin(a)*.65,a,Math.cos(a)*.65);o.updateMatrix();leaves.setMatrixAt(l++,o.matrix);}}crops.add(stems,leaves);stems.castShadow=leaves.castShadow=false;stems.receiveShadow=leaves.receiveShadow=true;
  const rotor=fan(root,[0,2.0,-1.78],.27);rotor.parent.rotation.y=Math.PI;moving.add(rotor);panel(root,[0,.85,1.80],.64,.43);light(root,[1.51,1.39,2.43],lights);animate=()=>{rotor.rotation.z=-phase*2.8;crops.rotation.z=Math.sin(phase*.4)*.006;};
 }else if(type==='observatory'){
  height=4.18;cyl(root,1.8,1.86,1.70,[0,1.10,-.25],finish.white,40);for(const y of [.35,1.91])ringY(root,1.84,.05,[0,y,-.25],mat.metal);
  const dome=new T.Group();dome.position.set(0,1.95,-.25);dome.rotation.y=Math.PI/2;root.add(dome);moving.add(dome);
  mesh(new T.SphereGeometry(1.8,40,20,.22,Math.PI*2-.44,0,Math.PI/2),finish.white,dome);ringY(dome,1.82,.04,[0,0,0],mat.metal);
  for(const a of [-.22,.22]){const pts=[];for(let i=0;i<=20;i++){const t=i/20*Math.PI/2;pts.push(new T.Vector3(-Math.cos(a)*Math.sin(t)*1.815,Math.cos(t)*1.815,Math.sin(a)*Math.sin(t)*1.815));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),24,.025,5,false),mat.metal,dome);}
  const telescope=new T.Group();telescope.position.y=.15;telescope.rotation.z=Math.PI*.30;dome.add(telescope);cyl(telescope,.29,.34,1.8,[0,1.00,0],mat.trim,24);ringY(telescope,.31,.04,[0,1.83,0]);cyl(telescope,.26,.26,.045,[0,1.94,0],finish.screen,24);cyl(telescope,.35,.35,.20,[0,.15,0],mat.metal,20);
  for(const y of [.5,1.3])ringY(telescope,.34,.035,[0,y,0],mat.metal);
  ladder(root,[-1.62,.27,.63],1.49,.36);box(root,[.60,1.13,.12],[0,.92,1.64],mat.dark);panel(root,[0,.94,1.72],.47,.88);light(root,[1.45,1.39,2.43],lights);animate=()=>{dome.rotation.y=Math.PI/2+phase*.028;};
 }else if(type==='antimatterlab'){
  height=4.20;
  box(root,[2.15,.51,1.52],[0,.57,-.4],mat.trim);for(const x of [-1.08,1.08])beam(root,[x,.78,-.4],[x,2.07,-.4],.10,finish.white);
  const housing=new T.Group();housing.position.set(0,2.32,-.4);root.add(housing);torus(housing,1.36,.15,[0,0,0],mat.metal);
  for(let i=0;i<10;i++){const a=i*Math.PI/5,o=box(housing,[.23,.35,.33],[Math.cos(a)*1.36,Math.sin(a)*1.36,0],finish.white);o.rotation.z=a-Math.PI/2;box(housing,[.19,.23,.37],[Math.cos(a)*1.36,Math.sin(a)*1.36,0],finish.copper).rotation.z=a-Math.PI/2;}
  const fieldMaterial=new T.MeshStandardMaterial({color:'#7895a6',emissive:'#aacada',emissiveIntensity:0,roughness:.34,metalness:.50}),field=new T.Group();housing.add(field);moving.add(field);const one=torus(field,1.02,.032,[0,0,0],fieldMaterial);one.rotation.x=.42;const two=torus(field,.85,.035,[0,0,0],fieldMaterial);two.rotation.y=Math.PI/2;
  const coreMaterial=new T.MeshBasicMaterial({color:'#d5e5ed',toneMapped:false});sphere(housing,.115,[0,0,0],coreMaterial,16);const halo=frostedMist(housing,1)[0];halo.material.blending=T.AdditiveBlending;halo.scale.setScalar(.92);halo.position.set(0,0,0);
  tank(root,[-1.82,.23,-.6],.35,1.31);pipe(root,[[-1.82,1.68,-.6],[-1.82,2.21,-.6],[-1.27,2.21,-.4]],.055,finish.copper);vent(root,[1.82,1.0,-.15],.56,.75);box(root,[.67,1.31,.62],[1.82,.89,-.50],mat.trim);
  light(root,[0,1.39,2.43],lights);animate=a=>{field.rotation.y=phase*1.15;field.rotation.z=phase*.31;fieldMaterial.emissiveIntensity=a*1.1;coreMaterial.color.setRGB(.035+a*1.35,.045+a*1.5,.05+a*1.65);halo.material.opacity=a*.24;};
 }else if(type==='tradehub'){
  height=4.30;
  for(const x of [-2.0,2.0])for(const z of [-1.61,1.61]){beam(root,[x,.23,z],[x,3.82,z],.085,mat.trim);box(root,[.36,.16,.36],[x,.36,z],mat.metal);}
  for(const z of [-1.61,1.61]){beam(root,[-2.0,3.82,z],[2.0,3.82,z],.11,finish.blue);beam(root,[-2.0,3.42,z],[2.0,3.42,z],.045);}
  beam(root,[-2.0,3.83,-1.61],[-2.0,3.83,1.61],.09);beam(root,[2.0,3.83,-1.61],[2.0,3.83,1.61],.09);
  tank(root,[-1.32,.24,-.5],.54,1.6);for(const y of [.79,1.91])ringY(root,.57,.035,[-1.32,y,-.5],finish.blue);
  for(const y of [.76,1.78]){box(root,[.97,.90,.98],[1.22,y,-.43],finish.white);for(const x of [.85,1.59])box(root,[.055,.94,1.02],[x,y,-.43],mat.metal);panel(root,[1.22,y,.11],.51,.34);}
  const shuttle=new T.Group();shuttle.position.set(0,3.58,.1);root.add(shuttle);moving.add(shuttle);box(shuttle,[.67,.28,.57],[0,0,0],mat.metal);beam(shuttle,[0,-.12,0],[0,-1.28,0],.021,mat.dark);box(shuttle,[.87,.64,.72],[0,-1.65,0],finish.white);for(const x of [-.29,.29])box(shuttle,[.055,.68,.77],[x,-1.65,0],mat.metal);
  box(root,[.68,1.0,.58],[-.65,.75,1.37],mat.trim);box(root,[.47,.31,.045],[-.65,1.04,1.704],finish.screen);pipe(root,[[-.65,.61,1.13],[-.65,.36,.22],[-1.32,.36,-.5]],.04,mat.rubber);
  beam(root,[1.80,3.83,-1.54],[1.80,4.21,-1.54],.015,mat.metal);sphere(root,.035,[1.80,4.23,-1.54],mat.trim,10);light(root,[0,1.39,2.43],lights);animate=()=>{shuttle.position.x=Math.sin(phase*.22)*.56;shuttle.position.y=3.58+Math.sin(phase*.35)*.10;};
 }
 root.userData.height=height;animate(0);
 root.traverse(object=>{if(object.isMesh){object.castShadow=false;object.receiveShadow=!object.material.transparent;}});stationaryBatches(root,moving);
 return {root,update(time,activity=0){
  const now=finite(time),dt=previous===null?0:T.MathUtils.clamp(now-previous,0,.25),target=T.MathUtils.clamp(finite(activity),0,1);previous=now;
  blend+=(target-blend)*(1-Math.exp(-dt*6));if(target===0&&blend<.00005)blend=0;phase=(phase+dt*blend*2)%(Math.PI*2000);animate(blend);
  lights.forEach((m,i)=>{m.emissiveIntensity=.035+blend*(.35+.018*Math.sin(phase*.6+i));});
 }};
}

