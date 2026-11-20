// The generator has no browser or renderer dependencies. Geometry is regenerated;
// only player changes are persisted. A world coordinate is never a render coordinate.
export const CELL=4, N=16, SIZE=CELL*N;
export const BIOMES=[
 {id:'office',name:'Yellow offices',height:3.25,wall:'#c4b476',floor:'#776e46',ceiling:'#b2ad91',light:'#fff0bc',brightness:.8,hum:60},
 {id:'maintenance',name:'Maintenance',height:3.8,wall:'#75766c',floor:'#555951',ceiling:'#434c49',light:'#c4dfcd',brightness:.42,hum:48},
 {id:'storage',name:'Storage',height:6.4,wall:'#858377',floor:'#68675c',ceiling:'#373a39',light:'#ffe2af',brightness:.6,hum:54},
 {id:'hotel',name:'The hotel',height:3.7,wall:'#796857',floor:'#514244',ceiling:'#b8ad93',light:'#ffcc8b',brightness:.65,hum:42},
 {id:'pool',name:'Poolrooms',height:6.8,wall:'#c0d8d0',floor:'#95bbb8',ceiling:'#c5d5c9',light:'#d5fff3',brightness:.85,hum:32},
 {id:'tunnels',name:'Utility tunnels',height:2.5,wall:'#596562',floor:'#4c5854',ceiling:'#38433f',light:'#b8d1a9',brightness:.28,hum:38},
 {id:'concrete',name:'Concrete complex',height:11,wall:'#91958e',floor:'#717872',ceiling:'#686f6a',light:'#e1e6d6',brightness:.55,hum:28},
 {id:'industrial',name:'Industrial complex',height:8.4,wall:'#6b736c',floor:'#505a54',ceiling:'#394340',light:'#e9c58a',brightness:.48,hum:46},
 {id:'unknown',name:'The pale archive',height:7.6,wall:'#b6b7ac',floor:'#7b8280',ceiling:'#d2d5c6',light:'#f0fff9',brightness:.6,hum:24}
];
export const DIFFICULTY={explorer:{drain:.5,loot:1.5,perception:.8,speed:.85,encounter:1.7,damage:.65},survival:{drain:1,loot:1,perception:1,speed:1,encounter:1,damage:1},nightmare:{drain:1.65,loot:.65,perception:1.35,speed:1.12,encounter:.7,damage:1.5}};
export function hashText(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function hash(seed,x,z,salt=0){let h=seed^Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(salt,2246822519);h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;}
export function rng(seed){return ()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
const smooth=t=>t*t*(3-2*t), lerp=(a,b,t)=>a+(b-a)*t;
export function noise(seed,x,z,salt=0){const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(x-ix),fz=smooth(z-iz);const v=(a,b)=>hash(seed,a,b,salt)/4294967296;return lerp(lerp(v(ix,iz),v(ix+1,iz),fx),lerp(v(ix,iz+1),v(ix+1,iz+1),fx),fz);}
const ADJ=[[1,2,3,6],[7,2,6,5],[0,1,7],[0,6,4],[6,1,5],[1,7,6],[0,4,7,3],[1,2,6],[6,3,4]];
export class World {
 constructor(seed,difficulty='survival',changes={}){this.seed=String(seed);this.seedHash=hashText(seed);this.difficulty=DIFFICULTY[difficulty]||DIFFICULTY.survival;this.changes=changes;this.cache=new Map();this.limit=100;}
 biomeAt(x,z){
  // Domain-warped cellular regions: boundaries cross chunk edges and are irregular.
  const dist=Math.hypot(x-34,z-34);if(dist<78)return {index:0,secondary:0,blend:0};
  const wx=x+(noise(this.seedHash,x/270,z/270,31)-.5)*150,wz=z+(noise(this.seedHash,x/270,z/270,32)-.5)*150;
  const spacing=260,gx=Math.floor(wx/spacing),gz=Math.floor(wz/spacing);let near=[];
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   const rx=gx+dx,rz=gz+dz,r=rng(hash(this.seedHash,rx,rz,51));const px=(rx+r())*spacing,pz=(rz+r())*spacing;
   const depth=Math.hypot(px-34,pz-34);let b;
   if(rx===0&&rz===0)b=0;else {const v=r();const weights=depth<500?[.30,.23,.2,.10,.03,.05,.07,.02,0]:depth<1600?[.18,.16,.14,.13,.1,.1,.12,.065,.005]:[.12,.12,.11,.12,.14,.10,.14,.12,.03];let k=0;b=8;for(let i=0;i<weights.length;i++){k+=weights[i];if(v<k){b=i;break;}}}
   // Coherent neighbours commonly inherit a compatible category from a macro anchor.
   const mx=Math.floor(rx/3),mz=Math.floor(rz/3),anchor=hash(this.seedHash,mx,mz,52)%8;
   if(r()<.48&&depth>420)b=ADJ[anchor][Math.floor(r()*ADJ[anchor].length)];
   near.push({d:Math.hypot(wx-px,wz-pz),b});
  }near.sort((a,b)=>a.d-b.d);
  let index=near[0].b;
  // Small embedded sublevels and very rare micro-biomes.
  const pocket=noise(this.seedHash,x/53,z/53,83);if(pocket>.91&&dist>110)index=4;
  if(noise(this.seedHash,x/22,z/22,87)>.963&&dist>600)index=8;
  return {index,secondary:near[1].b,blend:Math.max(0,1-(near[1].d-near[0].d)/24)*.5};
 }
 portal(cx,cz,axis){return 4+(hash(this.seedHash,cx,cz,axis===0?3:4)%8);}
 liftAt(cx,cz){const rx=Math.floor(cx/12),rz=Math.floor(cz/12),r=rng(hash(this.seedHash,rx,rz,719));if(r()>.07)return null;const stops=[];while(stops.length<3){const x=rx*12+Math.floor(r()*12),z=rz*12+Math.floor(r()*12);if(!stops.some(a=>a.cx===x&&a.cz===z))stops.push({cx:x,cz:z});}const index=stops.findIndex(a=>a.cx===cx&&a.cz===cz);return index<0?null:{id:`lift:${rx}:${rz}`,stops,index};}
 structureAt(cx,cz){
  const rx=Math.floor(cx/4),rz=Math.floor(cz/4),r=rng(hash(this.seedHash,rx,rz,620));
  const v=r(),ax=rx*4+Math.floor(r()*3),az=rz*4+Math.floor(r()*3);
  if(v>.073||cx<ax||cx>ax+1||cz<az||cz>az+1||Math.hypot(cx,cz)<3)return null;
  const tier=v<.001?'extremely rare':v<.004?'very rare':v<.022?'rare':'uncommon';
  const biome=this.biomeAt(ax*SIZE+32,az*SIZE+32).index;
  const titles=['Office cafeteria','Generator facility','Freight depot','Grand atrium','Immense reservoir','Pumping station','Monolith hall','Turbine works','Silent archive'];
  return {id:`structure:${rx}:${rz}`,name:titles[biome],tier,anchor:[ax,az],biome};
 }
 chunk(cx,cz){const key=`${cx},${cz}`;if(this.cache.has(key))return this.cache.get(key);const c=this.generate(cx,cz);this.cache.set(key,c);if(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);return c;}
 generate(cx,cz){
  const key=`${cx},${cz}`,r=rng(hash(this.seedHash,cx,cz,200)),biome=this.biomeAt(cx*SIZE+32,cz*SIZE+32).index;
  const structure=this.structureAt(cx,cz),lift=this.liftAt(cx,cz),grid=new Uint8Array(N*N),rooms=[],props=[],doors=[],items=[],lights=[],ramps=[],wet=[];
  const coord=(x,z)=>({x:cx*SIZE+x*CELL,z:cz*SIZE+z*CELL});
  const rect=(x,z,w,d)=>{for(let j=Math.max(0,z);j<Math.min(N,z+d);j++)for(let i=Math.max(0,x);i<Math.min(N,x+w);i++)grid[j*N+i]=1;};
  const room=(x,z,w,d)=>{rect(x,z,w,d);rooms.push({x,z,w,d});};
  const path=(x,z,tx,tz,width=1)=>{if(r()<.5){rect(Math.min(x,tx),z,Math.abs(x-tx)+width,width);rect(tx,Math.min(z,tz),width,Math.abs(z-tz)+width);}else{rect(x,Math.min(z,tz),width,Math.abs(z-tz)+width);rect(Math.min(x,tx),tz,Math.abs(x-tx)+width,width);}};
  const count=(a,b)=>a+Math.floor(r()*(b-a+1));
  room(6,6,4,4);
  if(structure){room(1,1,14,14);}
  else if(biome===0){for(let i=0;i<count(7,12);i++){const w=count(2,5),d=count(2,5),x=count(1,14-w),z=count(1,14-d);room(x,z,w,d);path(x+Math.floor(w/2),z+Math.floor(d/2),8,8,count(1,2));}for(let i=0;i<3;i++){const a=rooms[count(0,rooms.length-1)],b=rooms[count(0,rooms.length-1)];path(a.x+1,a.z+1,b.x+1,b.z+1);}}
  else if(biome===1||biome===5){rect(2,7,12,biome===5?1:2);rect(7,2,biome===5?1:2,12);for(let i=0;i<count(4,8);i++){const w=count(2,4),d=count(2,4),x=count(1,13-w),z=count(1,13-d);room(x,z,w,d);path(x+1,z+1,8,8);}if(biome===5){rect(2,2,1,11);rect(2,2,11,1);rect(12,2,1,11);}}
  else if(biome===2||biome===7){room(2,2,12,12);if(r()<.5){for(let z=3;z<13;z+=4)for(let x=3;x<13;x+=4)rect(x,z,2,1);}}
  else if(biome===3){rect(7,1,2,14);rect(1,7,14,2);for(let z=1;z<14;z+=4){room(2,z,4,3);room(10,z,4,3);rect(6,z+1,1,1);rect(9,z+1,1,1);const p=coord(6.5,z+1.5),q=coord(9.5,z+1.5);doors.push({id:`${key}:door:${z}:a`,...p,axis:'x',number:100+Math.abs(hash(this.seedHash,cx,cz,z)%800)},{id:`${key}:door:${z}:b`,...q,axis:'x',number:101+Math.abs(hash(this.seedHash,cx,cz,z)%800)});}if(r()<.3)room(4,4,8,8);}
  else if(biome===4){for(let i=0;i<5;i++){const w=count(4,8),d=count(4,8),x=count(1,15-w),z=count(1,15-d);room(x,z,w,d);path(x+2,z+2,8,8,2);} }
  else if(biome===6||biome===8){room(1,1,14,14);if(r()<.6){for(let z=2;z<14;z+=5)for(let x=2;x<14;x+=5){const p=coord(x+.5,z+.5);props.push({kind:'pillar',...p,w:1.3,d:1.3,h:BIOMES[biome].height});}}}
  const exits=[{x:0,z:this.portal(cx,cz,0)},{x:15,z:this.portal(cx+1,cz,0)},{x:this.portal(cx,cz,1),z:0},{x:this.portal(cx,cz+1,1),z:15}];
  // Every boundary has one shared aperture and a clear route to the centre.
  for(const e of exits)path(e.x,e.z,8,8,1);
  // Keep outer edges shut except the shared aperture, preventing seam holes.
  for(let i=0;i<N;i++){grid[i]=0;grid[(N-1)*N+i]=0;grid[i*N]=0;grid[i*N+N-1]=0;}
  for(const e of exits){grid[e.z*N+e.x]=1;if(e.x===0)grid[e.z*N+1]=1;if(e.x===15)grid[e.z*N+14]=1;if(e.z===0)grid[N+e.x]=1;if(e.z===15)grid[14*N+e.x]=1;}
  // Edge closure may clip doglegs: repair each portal through the inner ring.
  for(const e of exits){const x=Math.min(14,Math.max(1,e.x)),z=Math.min(14,Math.max(1,e.z));rect(Math.min(x,8),z,Math.abs(x-8)+1,1);rect(8,Math.min(z,8),1,Math.abs(z-8)+1);}
  const add=(kind,x,z,w,d,h,extra={})=>props.push({kind,...coord(x,z),w,d,h,...extra});
  const floor=(x,z)=>x>0&&x<15&&z>0&&z<15&&grid[Math.floor(z)*N+Math.floor(x)]===1;
  for(let z=2;z<14;z++)for(let x=2;x<14;x++)if(grid[z*N+x]){
   if((x+z)%3===0&&r()<.7)lights.push({...coord(x+.5,z+.5),y:BIOMES[biome].height-.12,live:r()>.09});
   if(biome===4&&(x<7||x>9)&&(z<7||z>9))wet.push({x,z,deep:r()<.12});
   if(biome===2&&x>=3&&x<=12&&z>=3&&z<=12&&z%2===1&&x!==8)add('shelf',x+.22,z+.5,1.1,6.4,3.8);
   if(biome===7&&x%3===0&&z%3===0&&x!==8&&z!==8)add('machine',x+.22,z+.5,1.1,2.6,2.7);
   if(biome===4&&x%5===0&&z%5===0)add('pillar',x+.22,z+.22,.65,.65,BIOMES[biome].height);
   if((biome===1||biome===5||biome===7)&&z%5===0&&x%3===0&&x!==8&&z!==8)add('boiler',x+.18,z+.25,1.1,1.1,1.9);
   if(biome===0&&r()<.035&&x!==8&&z!==8)add('pillar',x+.12,z+.12,.65,.65,3.25);
  }
  const camp=(cx===0&&cz===0)||r()<.021;let landmark=null;
  if(camp){const p=coord(8.5,8.5);landmark={id:`${key}:shelter`,kind:'shelter',name:'Abandoned shelter',...p,safe:true};add('cot',9.5,9.4,2.4,.9,.42);add('crate',7.4,9.4,.9,.65,.72,{storage:true,id:`${key}:storage`});add('locker',9.5,6.6,1.1,.8,2.3,{id:`${key}:locker`});}
  else if(r()<.37){let a=rooms[count(0,rooms.length-1)],x=a.x+.5,z=a.z+.5;if(!floor(x,z)){x=8.5;z=8.5;}const kind=biome===3?'reception':biome===1||biome===7?'generator':biome===4?'treatment':r()<.5?'vending':'workstation';landmark={id:`${key}:landmark`,kind,name:{reception:'Unattended reception',generator:'Auxiliary generator',treatment:'Water treatment',vending:'Vending alcove',workstation:'Abandoned workstation'}[kind],...coord(x,z)};add(kind,x,z,1.1,.8,kind==='vending'?2.1:.9,{id:landmark.id});if(floor(x+1,z+1))add('locker',x+1.1,z+1.1,1,.8,2.3,{id:`${key}:locker`});}
  // Raised platforms with physical ramps are confined to large spaces.
  if((biome===6||biome===7||biome===3&&rooms.some(a=>a.w>=8))&&r()<.42){const p=coord(10,10);if([9,10,11].every(x=>[9,10,11].every(z=>grid[z*N+x]))){ramps.push({x:p.x-1.1,z:p.z-4,w:2.2,d:8,height:1.5,steps:biome===3||r()<.45?6:0});add('platform',10,11.5,2.2,4,1.5,{nonblocking:true});}}
  if(landmark){const loot=rng(hash(this.seedHash,cx,cz,451)),tables=[['water','food','battery','glow'],['battery','tool','glow','medkit'],['food','water','battery','glow','chalk'],['food','water','medkit','battery'],['water','glow','battery'],['tool','battery','glow'],['water','glow','chalk','food'],['tool','battery','medkit','glow'],['glow','water','chalk']],inventory=tables[biome];const total=camp?5:Math.max(1,Math.round((1+Math.floor(loot()*3))*this.difficulty.loot*(biome===2?1.4:1)));for(let i=0;i<total;i++){const type=camp?['water','food','battery','chalk','note'][i]:inventory[Math.floor(loot()*inventory.length)];items.push({id:`${key}:item:${i}`,type,x:landmark.x+.95+(i%2)*.42,z:landmark.z+1+Math.floor(i/2)*.4,y:0});}if(!camp&&loot()<.38)items.push({id:`${key}:note`,type:'note',x:landmark.x+.9,z:landmark.z+.4,y:.008,note:hash(this.seedHash,cx,cz,450)%12});add('backpack',(landmark.x-cx*SIZE)/4-.2,(landmark.z-cz*SIZE)/4+.35,.45,.35,.35,{nonblocking:true});}
  // Sparse everyday debris, placed along edges rather than in paths.
  if(lift){add('lift',8.5,7.25,3,3,Math.min(2.6,BIOMES[biome].height-.12),{nonblocking:true,id:lift.id,stops:lift.stops,index:lift.index});add('liftwall',8.14,7.25,.12,3,Math.min(2.6,BIOMES[biome].height-.12));add('liftwall',8.86,7.25,.12,3,Math.min(2.6,BIOMES[biome].height-.12));add('liftwall',8.5,6.88,3,.12,Math.min(2.6,BIOMES[biome].height-.12));}
  for(let i=0;i<4;i++){const x=count(2,13),z=count(2,13);if(floor(x,z)&&x!==8&&z!==8&&r()<.45)add('box',x+.12,z+.14,.62,.58,.45);}
  // Clean any generated prop that would occupy a guaranteed portal or centre route.
  if(landmark&&biome===4)for(let i=wet.length-1;i>=0;i--){const a=wet[i];if(Math.abs(cx*SIZE+a.x*4+2-landmark.x)<6&&Math.abs(cz*SIZE+a.z*4+2-landmark.z)<6)wet.splice(i,1);}
  const cleanProps=props.filter(p=>p.nonblocking||!(Math.abs(p.x-(cx*SIZE+34))<1.5&&Math.abs(p.z-(cz*SIZE+34))<1.5));
  const c={cx,cz,key,biome,height:BIOMES[biome].height,grid,rooms,props:cleanProps,doors,items,lights,ramps,wet,landmark,structure,exits};
  return c;
 }
 tile(gx,gz){const cx=Math.floor(gx/N),cz=Math.floor(gz/N),c=this.chunk(cx,cz),x=gx-cx*N,z=gz-cz*N;return {c,x,z,open:!!c.grid[z*N+x]};}
 open(x,z){return this.tile(Math.floor(x/CELL),Math.floor(z/CELL)).open;}
 delta(key){return this.changes[key]||(this.changes[key]={taken:[],doors:{},markers:[],storage:{}});}
 isDoorOpen(d,c){return !!this.changes[c.key]?.doors?.[d.id];}
 blockers(x,z){const cx=Math.floor(x/SIZE),cz=Math.floor(z/SIZE);let b=[];for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const c=this.chunk(cx+dx,cz+dz);for(const p of c.props)if(!p.nonblocking)b.push(p);for(const d of c.doors){if(!this.isDoorOpen(d,c))b.push({...d,w:.22,d:3.85,h:2.5});else b.push({...d,x:d.x+(d.x-c.cx*SIZE<32?-1.9:1.9),z:d.z-1.9,w:3.8,d:.22,h:2.5});}}return b;}
 canStand(x,z,radius=.27,feet=0){for(const [dx,dz] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]])if(!this.open(x+dx,z+dz))return false;for(const p of this.blockers(x,z))if((p.h||2.5)>feet+.01&&Math.abs(x-p.x)<p.w/2+radius&&Math.abs(z-p.z)<p.d/2+radius)return false;return true;}
 ceiling(x,z){const c=this.chunk(Math.floor(x/SIZE),Math.floor(z/SIZE));let height=c.height;for(const p of c.props)if(p.kind==='lift'&&Math.abs(x-p.x)<p.w/2&&Math.abs(z-p.z)<p.d/2)height=Math.min(height,p.h-.12);if([1,5,7].includes(c.biome)&&[33.1,34.9].some(px=>Math.abs(x-c.cx*SIZE-px)<.35))height=Math.min(height,c.height-.46);return height;}
 ground(x,z,includeProps=true){const {c,x:tx,z:tz}=this.tile(Math.floor(x/CELL),Math.floor(z/CELL));let h=0;const wet=c.wet.find(a=>a.x===tx&&a.z===tz);if(wet){const fx=x-Math.floor(x/CELL)*CELL,fz=z-Math.floor(z/CELL)*CELL,edge=Math.min(fx,4-fx,fz,4-fz);h=wet.deep?-.35-Math.min(edge/2,1)*2:-.35;}for(const a of c.ramps)if(x>=a.x&&x<=a.x+a.w&&z>=a.z&&z<=a.z+a.d){let t=(z-a.z)/a.d;if(a.steps)t=Math.ceil(t*a.steps)/a.steps;h=Math.max(h,t*a.height);}for(const p of c.props)if(includeProps&&(p.kind==='platform'||!p.nonblocking)&&Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.d/2)h=Math.max(h,p.h);return {height:h,water:!!wet,deep:h<-.9};}
 lineOfSight(x,z,tx,tz){const d=Math.hypot(tx-x,tz-z),n=Math.ceil(d/.75);for(let i=1;i<n;i++){const px=lerp(x,tx,i/n),pz=lerp(z,tz,i/n);if(!this.open(px,pz))return false;}for(const p of this.blockers((x+tx)/2,(z+tz)/2)){// slab intersection in two dimensions
   let a=0,b=1;for(const [v,dv,min,max] of [[x,tx-x,p.x-p.w/2,p.x+p.w/2],[z,tz-z,p.z-p.d/2,p.z+p.d/2]]){if(Math.abs(dv)<1e-9){if(v<min||v>max){a=2;break;}}else{let t1=(min-v)/dv,t2=(max-v)/dv;if(t1>t2)[t1,t2]=[t2,t1];a=Math.max(a,t1);b=Math.min(b,t2);}}if(a<b&&b>0&&a<1)return false;
  }return true;}
 path(x,z,tx,tz,max=1500){const step=CELL/2,start=[Math.floor(x/step),Math.floor(z/step)],end=[Math.floor(tx/step),Math.floor(tz/step)],key=(x,z)=>`${x},${z}`,queue=[],came=new Map([[key(...start),null]]),cost=new Map([[key(...start),0]]),obstacles=new Map();let found=null;
  const score=(a,b)=>Math.abs(a-end[0])+Math.abs(b-end[1]);
  const push=a=>{queue.push(a);let i=queue.length-1;while(i>0){const p=(i-1)>>1;if(queue[p].f<=a.f)break;queue[i]=queue[p];i=p;}queue[i]=a;};
  const pop=()=>{const root=queue[0],tail=queue.pop();if(queue.length){let i=0;while(i*2+1<queue.length){let j=i*2+1;if(j+1<queue.length&&queue[j+1].f<queue[j].f)j++;if(queue[j].f>=tail.f)break;queue[i]=queue[j];i=j;}queue[i]=tail;}return root;};
  const valid=(gx,gz)=>{const px=(gx+.5)*step,pz=(gz+.5)*step,{c,open}=this.tile(Math.floor(px/CELL),Math.floor(pz/CELL));if(!open)return false;if(!obstacles.has(c.key)){const b=c.props.filter(p=>!p.nonblocking);for(const d of c.doors)b.push(this.isDoorOpen(d,c)?{x:d.x+(d.x-c.cx*SIZE<32?-1.9:1.9),z:d.z-1.9,w:3.8,d:.22}:{...d,w:.22,d:3.85});obstacles.set(c.key,b);}return !obstacles.get(c.key).some(p=>Math.abs(px-p.x)<p.w/2+.35&&Math.abs(pz-p.z)<p.d/2+.35);};
  push({p:start,g:0,f:score(...start)});for(let q=0;queue.length&&q<max;q++){const node=pop(),a=node.p;if(node.g!==cost.get(key(...a)))continue;if(a[0]===end[0]&&a[1]===end[1]){found=a;break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const p=[a[0]+dx,a[1]+dz],k=key(...p),g=node.g+1;if(g>=(cost.get(k)??Infinity)||!valid(...p))continue;cost.set(k,g);came.set(k,a);push({p,g,f:g+score(...p)});}}
  if(!found)return [];const result=[];while(found){result.push({x:(found[0]+.5)*step,z:(found[1]+.5)*step});found=came.get(key(...found));}return result.reverse().slice(1);
 }
}



